import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { LAB_ANALYSIS_SYSTEM_PROMPT } from "../prompts/labAnalysis";

export const analyzeWithAI = onCall(
  { secrets: [anthropicApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { prompt, context, maxTokens } = request.data;

    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "Prompt is required");
    }

    const allowed = await checkRateLimit(request.auth.uid, "ai-analysis");
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
    }

    try {
      const response = await callClaude(
        LAB_ANALYSIS_SYSTEM_PROMPT,
        context ? `${prompt}\n\nContext: ${context}` : prompt,
        maxTokens || 1024
      );

      await logAuditEvent(
        "ai-analysis",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "analysis",
        { inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens }
      );

      return response;
    } catch (error) {
      console.error("AI analysis error:", error);
      throw new HttpsError("internal", "Failed to process AI analysis");
    }
  }
);
