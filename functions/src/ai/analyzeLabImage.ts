import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAnthropicClient, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { LAB_IMAGE_EXTRACTION_PROMPT } from "../prompts/labAnalysis";

export const analyzeLabImage = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    maxInstances: 10,
    minInstances: 1,
    memory: "1GiB",
    cpu: 2,
    region: "europe-west1",
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { imageBase64, mediaType } = request.data;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "Image data is required");
    }

    const allowed = await checkRateLimit(request.auth.uid, "lab-image-analysis");
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
    }

    try {
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-haiku-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: LAB_IMAGE_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const content = textContent?.text || "";

      await logAuditEvent(
        "lab-image-analysis",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "lab-ocr",
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      );

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error("Lab image analysis error:", error);
      throw new HttpsError("internal", "Failed to analyze lab image");
    }
  }
);
