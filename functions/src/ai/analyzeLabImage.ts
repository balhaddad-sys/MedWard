import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAnthropicClient, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { LAB_IMAGE_EXTRACTION_PROMPT } from "../prompts/labAnalysis";

// Flag enum matching the Python extraction engine
type Flag = "normal" | "high" | "low" | "critical_high" | "critical_low";

interface LabResult {
  test_name: string;
  test_code: string;
  value: number | null;
  value_raw: string;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  flag: Flag;
}

interface LabPanel {
  panel_name: string;
  order_id: string;
  collected_at: string;
  results: LabResult[];
}

interface PatientInfo {
  file_number: string;
  civil_id: string;
  age: string;
  sex: string;
  visit_number: string;
  visit_date: string;
}

interface ExtractionResponse {
  patient: PatientInfo;
  panels: LabPanel[];
}

/**
 * Recompute flag from numeric value and reference range.
 * 50% beyond range boundary -> critical. HH/LL in raw string -> critical.
 */
function computeFlag(
  value: number | null,
  refLow: number | null,
  refHigh: number | null,
  raw: string = ""
): Flag {
  const rawUp = raw.toUpperCase().trim();
  if (rawUp.includes("HH")) return "critical_high";
  if (rawUp.includes("LL")) return "critical_low";

  if (value === null || refLow === null || refHigh === null) {
    return "normal";
  }

  const margin = (refHigh - refLow) * 0.5;

  if (value > refHigh + margin) return "critical_high";
  if (value < refLow - margin) return "critical_low";
  if (value > refHigh) return "high";
  if (value < refLow) return "low";
  return "normal";
}

function safeFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function stripCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-z]*\n?/, "");
    s = s.replace(/\n?```$/, "");
  }
  return s.trim();
}

function parseExtractionResponse(raw: string): ExtractionResponse {
  const cleaned = stripCodeFences(raw);
  const data = JSON.parse(cleaned);

  const patient: PatientInfo = {
    file_number: data.patient?.file_number || "",
    civil_id: data.patient?.civil_id || "",
    age: data.patient?.age || "",
    sex: data.patient?.sex || "",
    visit_number: data.patient?.visit_number || "",
    visit_date: data.patient?.visit_date || "",
  };

  const panels: LabPanel[] = (data.panels || []).map(
    (panel: Record<string, unknown>) => {
      const results: LabResult[] = (
        (panel.results as Record<string, unknown>[]) || []
      ).map((r: Record<string, unknown>) => {
        const value = safeFloat(r.value);
        const refLow = safeFloat(r.ref_low);
        const refHigh = safeFloat(r.ref_high);
        const valueRaw = String(r.value_raw || r.value || "");

        // Recompute flag — don't fully trust the AI's flag assignment
        const flag = computeFlag(value, refLow, refHigh, valueRaw);

        return {
          test_name: String(r.test_name || ""),
          test_code: String(r.test_code || ""),
          value,
          value_raw: valueRaw,
          unit: String(r.unit || ""),
          ref_low: refLow,
          ref_high: refHigh,
          flag,
        };
      });

      return {
        panel_name: String(panel.panel_name || "General"),
        order_id: String(panel.order_id || ""),
        collected_at: String(panel.collected_at || ""),
        results,
      };
    }
  );

  return { patient, panels };
}

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
      throw new HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. Please try again later."
      );
    }

    try {
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-haiku-4-20250514",
        max_tokens: 4096,
        system: LAB_IMAGE_EXTRACTION_PROMPT,
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
                text: "Extract all lab results from this image.",
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const rawContent = textContent?.text || "";

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

      // Parse and post-process with flag recomputation
      const extracted = parseExtractionResponse(rawContent);

      return {
        content: JSON.stringify(extracted),
        structured: extracted,
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
