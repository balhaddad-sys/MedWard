import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { SBAR_SYSTEM_PROMPT, SBAR_USER_PROMPT } from "../prompts/sbar";

export const generateSBAR = onCall(
  { secrets: [anthropicApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { patientData } = request.data;

    if (!patientData || typeof patientData !== "string") {
      throw new HttpsError("invalid-argument", "Patient data is required");
    }

    const allowed = await checkRateLimit(request.auth.uid, "sbar-generation");
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded");
    }

    try {
      const response = await callClaude(
        SBAR_SYSTEM_PROMPT,
        SBAR_USER_PROMPT(patientData),
        2048
      );

      await logAuditEvent(
        "sbar-generation",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "sbar",
        { inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens }
      );

      return response;
    } catch (error) {
      console.error("SBAR generation error:", error);
      throw new HttpsError("internal", "Failed to generate SBAR report");
    }
  }
);
