import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { SBAR_SYSTEM_PROMPT, SBAR_USER_PROMPT } from "../prompts/sbar";

function parseSBARSections(content: string): {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
} {
  const sections = { situation: "", background: "", assessment: "", recommendation: "" };

  const markers = [
    { key: "situation" as const, pattern: "---SITUATION---" },
    { key: "background" as const, pattern: "---BACKGROUND---" },
    { key: "assessment" as const, pattern: "---ASSESSMENT---" },
    { key: "recommendation" as const, pattern: "---RECOMMENDATION---" },
  ];

  for (let i = 0; i < markers.length; i++) {
    const startIdx = content.indexOf(markers[i].pattern);
    if (startIdx === -1) continue;

    const contentStart = startIdx + markers[i].pattern.length;
    const nextMarker = markers[i + 1];
    const endIdx = nextMarker ? content.indexOf(nextMarker.pattern) : -1;
    const sectionText = endIdx > -1
      ? content.substring(contentStart, endIdx)
      : content.substring(contentStart);

    sections[markers[i].key] = sectionText.trim();
  }

  // Fallback: if no sections were parsed, put everything in situation
  if (!sections.situation && !sections.background && !sections.assessment && !sections.recommendation) {
    sections.situation = content.trim();
  }

  return sections;
}

export const generateSBAR = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
  },
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

      const sbar = parseSBARSections(response.content);

      await logAuditEvent(
        "sbar-generation",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "sbar",
        { inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens }
      );

      return {
        situation: sbar.situation,
        background: sbar.background,
        assessment: sbar.assessment,
        recommendation: sbar.recommendation,
        usage: response.usage,
      };
    } catch (error) {
      console.error("SBAR generation error:", error);
      throw new HttpsError("internal", "Failed to generate SBAR report");
    }
  }
);
