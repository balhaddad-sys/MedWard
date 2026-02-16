/**
 * AI Gateway — Unified entry point for all AI requests
 *
 * Architecture:
 *   React → httpsCallable("aiGateway") → this function
 *     1) Auth check + rate limit
 *     2) PHI redaction + prompt normalization
 *     3) Exact cache lookup (SHA-256 hash match)
 *     4) Semantic cache lookup (Firestore KNN vector search)
 *     5) Claude call on cache miss
 *     6) Store response + embedding in ai_cache
 *     7) Audit log every request
 *     8) Return response to client
 *
 * Collections used:
 *   ai_cache   — prompt/response pairs with embeddings
 *   ai_audit   — immutable request log (medico-legal)
 *   rateLimits — per-user throttling (existing)
 */

import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callClaude, anthropicApiKey, type AIResponse } from "../utils/anthropic";
import { checkRateLimitDetailed } from "../utils/rateLimiter";
import { redactPHI, normalizeForHash } from "../utils/phiRedaction";
import { embedText, cosineSimilarity, EMBEDDING_DIMENSION } from "../utils/embeddings";

// ---------------------------------------------------------------------------
// Prompts (reuse existing)
// ---------------------------------------------------------------------------
import { LAB_ANALYSIS_SYSTEM_PROMPT } from "../prompts/labAnalysis";
import { CLINICAL_ASSISTANT_SYSTEM_PROMPT } from "../prompts/clinicalAssistant";
import { DRUG_INFO_SYSTEM_PROMPT } from "../prompts/drugInfo";
import { CLINICAL_CHAT_SYSTEM_PROMPT } from "../prompts/clinicalChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context tags control which system prompt and caching rules apply. */
type ContextTag =
  | "clinical_guidelines"
  | "lab_analysis"
  | "drug_info"
  | "sheet_parser"
  | "formatting"
  | "clinical_chat"
  | "general";

interface GatewayRequest {
  prompt: string;
  contextTag: ContextTag;
  context?: string;              // Optional additional context (patient data, etc.)
  systemInstruction?: string;    // Override default system prompt
  maxTokens?: number;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  skipCache?: boolean;           // Force fresh response
}

interface GatewayResponse {
  response: string;
  cacheHit: boolean;
  cacheType: "exact" | "semantic" | null;
  usage?: { inputTokens: number; outputTokens: number };
}

interface CacheDoc {
  contextTag: string;
  promptHash: string;
  promptNormalized: string;
  embedding: number[] | null;
  response: string;
  model: string;
  tokenUsage: { input: number; output: number };
  createdAt: admin.firestore.FieldValue;
  ttlAt: admin.firestore.Timestamp;
  hitCount: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEMANTIC_THRESHOLD = 0.92;     // High bar for clinical content
const SEMANTIC_TOP_K = 3;            // Number of nearest neighbors to check
const CACHE_TTL_DAYS = 30;
const MAX_PROMPT_LENGTH = 15_000;    // Safety limit
const MAX_CONTEXT_LENGTH = 50_000;

/** Tags that are safe to cache (deterministic, non-patient-specific). */
const CACHEABLE_TAGS = new Set<ContextTag>([
  "clinical_guidelines",
  "drug_info",
  "sheet_parser",
  "formatting",
]);

/** System prompts per context tag (fallbacks to the user-provided override). */
const SYSTEM_PROMPTS: Partial<Record<ContextTag, string>> = {
  clinical_guidelines: CLINICAL_ASSISTANT_SYSTEM_PROMPT,
  lab_analysis: LAB_ANALYSIS_SYSTEM_PROMPT,
  drug_info: DRUG_INFO_SYSTEM_PROMPT,
  clinical_chat: CLINICAL_CHAT_SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getCacheCollection() {
  return admin.firestore().collection("ai_cache");
}

function getAuditCollection() {
  return admin.firestore().collection("ai_audit");
}

// ---------------------------------------------------------------------------
// Cache operations
// ---------------------------------------------------------------------------

async function exactCacheLookup(
  contextTag: string,
  promptHash: string
): Promise<{ response: string; docId: string } | null> {
  const snap = await getCacheCollection()
    .where("contextTag", "==", contextTag)
    .where("promptHash", "==", promptHash)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  // Bump hit counter (fire-and-forget)
  doc.ref.update({ hitCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});
  return { response: doc.data().response, docId: doc.id };
}

async function semanticCacheLookup(
  contextTag: string,
  queryVec: number[]
): Promise<{ response: string; similarity: number; docId: string } | null> {
  try {
    const cacheRef = getCacheCollection();

    // Avoid vector-field orderBy issues; fetch a bounded candidate set and rank in memory.
    const snap = await cacheRef
      .where("contextTag", "==", contextTag)
      .limit(Math.max(SEMANTIC_TOP_K * 20, 50))
      .get();

    if (snap.empty) return null;

    let best: { response: string; similarity: number; docId: string } | null = null;

    for (const doc of snap.docs) {
      const data = doc.data();
      const embedding = data.embedding as unknown;

      if (
        !Array.isArray(embedding) ||
        embedding.length !== EMBEDDING_DIMENSION ||
        !embedding.every((v) => typeof v === "number")
      ) {
        continue;
      }

      const sim = cosineSimilarity(queryVec, embedding as number[]);
      if (sim >= SEMANTIC_THRESHOLD && (!best || sim > best.similarity)) {
        best = { response: data.response, similarity: sim, docId: doc.id };
      }
    }

    if (best) {
      getCacheCollection()
        .doc(best.docId)
        .update({ hitCount: admin.firestore.FieldValue.increment(1) })
        .catch(() => {});
    }

    return best;
  } catch (err) {
    console.warn("semanticCacheLookup failed:", err);
    return null;
  }
}

async function storeInCache(
  contextTag: string,
  promptHash: string,
  promptNormalized: string,
  embedding: number[] | null,
  response: string,
  model: string,
  tokenUsage: { input: number; output: number }
): Promise<void> {
  const ttlAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + CACHE_TTL_DAYS * 86_400_000
  );

  const doc: CacheDoc = {
    contextTag,
    promptHash,
    promptNormalized,
    embedding,
    response,
    model,
    tokenUsage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ttlAt,
    hitCount: 0,
  };

  await getCacheCollection().add(doc);
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

async function logAudit(
  uid: string,
  email: string,
  contextTag: string,
  cacheHit: boolean,
  cacheType: "exact" | "semantic" | null,
  latencyMs: number,
  tokenUsage?: { input: number; output: number }
): Promise<void> {
  await getAuditCollection().add({
    uid,
    email,
    contextTag,
    cacheHit,
    cacheType,
    latencyMs,
    tokenUsage: tokenUsage ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Main callable function
// ---------------------------------------------------------------------------

export const aiGateway = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request): Promise<GatewayResponse> => {
    const t0 = Date.now();

    // ── Auth ──
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email || "";

    // ── Rate limit ──
    const limitResult = await checkRateLimitDetailed(uid, "ai-gateway");
    if (!limitResult.allowed) {
      const retryAfterSec = Math.ceil(limitResult.retryAfterMs / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${retryAfterSec}s.`
      );
    }

    // ── Input validation ──
    const data = request.data as GatewayRequest | undefined;
    if (!data?.prompt || typeof data.prompt !== "string") {
      throw new HttpsError("invalid-argument", "prompt is required (string).");
    }
    if (!data.contextTag || typeof data.contextTag !== "string") {
      throw new HttpsError("invalid-argument", "contextTag is required.");
    }

    const prompt = data.prompt.slice(0, MAX_PROMPT_LENGTH);
    const contextTag = data.contextTag as ContextTag;
    const context = data.context?.slice(0, MAX_CONTEXT_LENGTH);
    const maxTokens = Math.min(data.maxTokens || 2048, 8192);
    const skipCache = data.skipCache === true;

    // ── Determine cacheability ──
    // SECURITY FIX: Disable caching when context is present to prevent cross-context leaks
    // Context often contains patient-specific PHI that would make cache key collisions unsafe
    const cacheAllowed = !skipCache && CACHEABLE_TAGS.has(contextTag) && !context;

    // ── PHI redaction + normalization (for cache key, not for Claude) ──
    const redacted = redactPHI(prompt);
    // SECURITY FIX: Include system instruction in cache key to prevent wrong responses
    const systemPrompt =
      data.systemInstruction ||
      SYSTEM_PROMPTS[contextTag] ||
      "You are a helpful clinical AI assistant. Be concise, evidence-based, and safe.";
    const normalized = normalizeForHash(`${contextTag}::${systemPrompt}::${redacted}`);
    const promptHash = sha256(normalized);

    // ── 1) Exact cache ──
    if (cacheAllowed) {
      const exact = await exactCacheLookup(contextTag, promptHash);
      if (exact) {
        await logAudit(uid, email, contextTag, true, "exact", Date.now() - t0);
        return {
          response: exact.response,
          cacheHit: true,
          cacheType: "exact",
        };
      }
    }

    // ── 2) Semantic cache ──
    let queryVec: number[] | null = null;
    if (cacheAllowed) {
      queryVec = await embedText(normalized);
      if (queryVec) {
        const semantic = await semanticCacheLookup(contextTag, queryVec);
        if (semantic) {
          await logAudit(uid, email, contextTag, true, "semantic", Date.now() - t0);
          return {
            response: semantic.response,
            cacheHit: true,
            cacheType: "semantic",
          };
        }
      }
    }

    // ── 3) Claude call ──
    try {
      // Note: systemPrompt is defined above for cache key calculation
      const fullPrompt = context ? `${prompt}\n\nContext:\n${context}` : prompt;

      let aiResponse: AIResponse;

      if (data.conversationHistory && data.conversationHistory.length > 0) {
        // Multi-turn: prepend history, append current user message
        const messages: Array<{ role: "user" | "assistant"; content: string }> = [
          ...data.conversationHistory.slice(-20), // Cap at 20 messages
          { role: "user" as const, content: fullPrompt },
        ];
        aiResponse = await callClaude(systemPrompt, messages, maxTokens);
      } else {
        aiResponse = await callClaude(systemPrompt, fullPrompt, maxTokens);
      }

      // ── 4) Store in cache ──
      if (cacheAllowed) {
        // Generate embedding if we didn't already (e.g., embedText returned null earlier)
        const vecToStore = queryVec || (await embedText(normalized));

        await storeInCache(
          contextTag,
          promptHash,
          normalized,
          vecToStore,
          aiResponse.content,
          "claude-haiku-4-5",
          { input: aiResponse.usage.inputTokens, output: aiResponse.usage.outputTokens }
        ).catch((err) => {
          // Cache store failure is non-fatal
          console.warn("aiGateway: failed to store cache entry:", err);
        });
      }

      // ── 5) Audit ──
      await logAudit(
        uid,
        email,
        contextTag,
        false,
        null,
        Date.now() - t0,
        { input: aiResponse.usage.inputTokens, output: aiResponse.usage.outputTokens }
      );

      return {
        response: aiResponse.content,
        cacheHit: false,
        cacheType: null,
        usage: aiResponse.usage,
      };
    } catch (err) {
      console.error("aiGateway: Claude call failed:", err);
      throw new HttpsError("internal", "AI processing failed. Please try again.");
    }
  }
);
