/**
 * extractHistoryFromImage — Cloud Function
 *
 * Uses Claude vision to extract structured clinical history
 * from photos of referral letters, transfer documents, clinical notes, etc.
 *
 * Pattern mirrors analyzeLabImage.ts.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAnthropicClient, anthropicApiKey, ANTHROPIC_MODEL } from "../utils/anthropic";
import { checkRateLimitDetailed } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { HISTORY_EXTRACTION_PROMPT } from "../prompts/historyExtraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryExtractionResponse {
  historyOfPresentingIllness: string;
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    route: string;
    indication?: string;
  }>;
  allergies: Array<{
    substance: string;
    reaction: string;
    severity: "mild" | "moderate" | "severe" | "life-threatening";
    type: "drug" | "food" | "environmental" | "other";
  }>;
  familyHistory: string;
  socialHistory: {
    occupation?: string;
    smoking?: string;
    alcohol?: string;
    illicitDrugs?: string;
    living?: string;
    functionalStatus?: string;
  };
  systemsReview: string;
  presentingComplaint?: string;
  confidence: Record<string, "high" | "medium" | "low" | "not_found">;
}

// ---------------------------------------------------------------------------
// JSON parsing helpers (same pattern as analyzeLabImage)
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-z]*\n?/, "");
    s = s.replace(/\n?```$/, "");
  }
  return s.trim();
}

function repairTruncatedJson(text: string): string {
  let s = text.trim();
  s = s.replace(/,\s*$/, "");
  s = s.replace(/,?\s*"[^"]*":\s*"?[^"{}[\],]*$/, "");
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) s += '"';
  while (stack.length > 0) s += stack.pop();
  return s;
}

function parseHistoryResponse(raw: string): HistoryExtractionResponse {
  const cleaned = stripCodeFences(raw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const repaired = repairTruncatedJson(cleaned);
    data = JSON.parse(repaired);
  }

  // Normalize with safe defaults
  return {
    historyOfPresentingIllness: data.historyOfPresentingIllness || "",
    pastMedicalHistory: Array.isArray(data.pastMedicalHistory) ? data.pastMedicalHistory : [],
    pastSurgicalHistory: Array.isArray(data.pastSurgicalHistory) ? data.pastSurgicalHistory : [],
    medications: Array.isArray(data.medications)
      ? data.medications.map((m: Record<string, unknown>) => ({
          name: String(m.name || ""),
          dose: String(m.dose || ""),
          frequency: String(m.frequency || ""),
          route: String(m.route || ""),
          indication: m.indication ? String(m.indication) : undefined,
        }))
      : [],
    allergies: Array.isArray(data.allergies)
      ? data.allergies.map((a: Record<string, unknown>) => ({
          substance: String(a.substance || ""),
          reaction: String(a.reaction || "unknown"),
          severity: ["mild", "moderate", "severe", "life-threatening"].includes(a.severity as string)
            ? (a.severity as "mild" | "moderate" | "severe" | "life-threatening")
            : "mild",
          type: ["drug", "food", "environmental", "other"].includes(a.type as string)
            ? (a.type as "drug" | "food" | "environmental" | "other")
            : "drug",
        }))
      : [],
    familyHistory: data.familyHistory || "",
    socialHistory: {
      occupation: data.socialHistory?.occupation || undefined,
      smoking: data.socialHistory?.smoking || undefined,
      alcohol: data.socialHistory?.alcohol || undefined,
      illicitDrugs: data.socialHistory?.illicitDrugs || undefined,
      living: data.socialHistory?.living || undefined,
      functionalStatus: data.socialHistory?.functionalStatus || undefined,
    },
    systemsReview: data.systemsReview || "",
    presentingComplaint: data.presentingComplaint || undefined,
    confidence: data.confidence || {},
  };
}

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------

export const extractHistoryFromImage = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    maxInstances: 10,
    minInstances: 1,
    memory: "1GiB",
    cpu: 2,
    region: "europe-west1",
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { imageBase64, mediaType } = request.data;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "Image data is required");
    }

    const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validatedMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType)
      ? mediaType
      : "image/jpeg";

    // Reject excessively large base64 payloads (>10MB decoded)
    if (imageBase64.length > 14_000_000) {
      throw new HttpsError("invalid-argument", "Image exceeds maximum size of 10MB");
    }

    const limitResult = await checkRateLimitDetailed(request.auth.uid, "history-image-extraction");
    if (!limitResult.allowed) {
      const retryAfterSec = Math.ceil(limitResult.retryAfterMs / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${retryAfterSec}s.`
      );
    }

    try {
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        system: HISTORY_EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: validatedMediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: "Extract all clinical history data from this image.",
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const rawContent = textContent?.text || "";

      await logAuditEvent(
        "history-image-extraction",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "history-ocr",
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      );

      const structured = parseHistoryResponse(rawContent);

      return {
        structured,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("History extraction error:", err);
      throw new HttpsError(
        "internal",
        "Failed to extract history from image. Please try again."
      );
    }
  }
);
