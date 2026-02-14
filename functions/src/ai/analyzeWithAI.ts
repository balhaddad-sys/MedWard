import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { LAB_ANALYSIS_SYSTEM_PROMPT } from "../prompts/labAnalysis";
import { CLINICAL_ASSISTANT_SYSTEM_PROMPT } from "../prompts/clinicalAssistant";
import { DRUG_INFO_SYSTEM_PROMPT } from "../prompts/drugInfo";

type PromptType = "lab-analysis" | "clinical-assistant" | "drug-info";

const SYSTEM_PROMPTS: Record<PromptType, string> = {
  "lab-analysis": LAB_ANALYSIS_SYSTEM_PROMPT,
  "clinical-assistant": CLINICAL_ASSISTANT_SYSTEM_PROMPT,
  "drug-info": DRUG_INFO_SYSTEM_PROMPT,
};

export const analyzeWithAI = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    // SECURITY FIX: Enforce App Check to prevent abuse
    consumeAppCheckToken: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { prompt, context, maxTokens, promptType } = request.data;

    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "Prompt is required");
    }

    const allowed = await checkRateLimit(request.auth.uid, "ai-analysis");
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
    }

    try {
      // Select system prompt based on type — default to lab-analysis for backwards compat
      const selectedType: PromptType =
        promptType && typeof promptType === "string" && promptType in SYSTEM_PROMPTS
          ? (promptType as PromptType)
          : "lab-analysis";
      const systemPrompt = SYSTEM_PROMPTS[selectedType];

      const response = await callClaude(
        systemPrompt,
        context ? `${prompt}\n\nContext: ${context}` : prompt,
        maxTokens || 2048
      );

      await logAuditEvent(
        "ai-analysis",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "analysis",
        {
          promptType: selectedType,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("AI analysis error:", error);
      throw new HttpsError("internal", "Failed to process AI analysis");
    }
  }
);
