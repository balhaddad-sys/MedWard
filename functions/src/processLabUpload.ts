import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
const db = getFirestore();

export const processLabUpload = onObjectFinalized(
  {
    memory: "1GiB",
    timeoutSeconds: 300,
    region: "us-central1",
    secrets: [anthropicApiKey],
  },
  async (event) => {
    const file = event.data;
    const filePath = file.name;

    if (!filePath || !filePath.startsWith("lab_uploads/")) return;
    if (!file.contentType?.startsWith("image/")) return;

    const segments = filePath.split("/");
    if (segments.length < 3) return;

    const patientId = segments[1];
    const filename = segments[2];
    const scanId = filename.split(".")[0];

    const resultRef = db
      .collection("patients")
      .doc(patientId)
      .collection("labs")
      .doc(scanId);

    try {
      await resultRef.set(
        { status: "processing", uploadedAt: FieldValue.serverTimestamp(), filePath },
        { merge: true }
      );

      const bucket = getStorage().bucket(file.bucket);
      const [buffer] = await bucket.file(filePath).download();
      const base64Image = buffer.toString("base64");

      const anthropic = new Anthropic({ apiKey: anthropicApiKey.value() });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: file.contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `You are a clinical laboratory assistant. Analyze this lab report image and extract ALL values.

Return a JSON object with this EXACT structure:
{
  "tests": [
    {
      "name": "Test Name",
      "value": 12.5,
      "unit": "g/dL",
      "referenceRange": "12.0-16.0",
      "flag": "Normal" | "High" | "Low" | "Critical"
    }
  ],
  "specimenType": "Blood" | "Urine" | "CSF" | "Other",
  "collectionDate": "YYYY-MM-DD or null if not visible",
  "labName": "Name of laboratory or null",
  "confidence": 0.0-1.0
}

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown or explanation
2. "value" must be a NUMBER, not a string
3. "flag" must be one of: "Normal", "High", "Low", "Critical"
4. Include ALL tests visible in the image`,
              },
            ],
          },
        ],
      });

      const aiText =
        response.content[0].type === "text" ? response.content[0].text : "";

      let parsedResult;
      try {
        const jsonMatch =
          aiText.match(/```json\s*([\s\S]*?)\s*```/) ||
          aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : aiText;
        parsedResult = JSON.parse(jsonString.trim());
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }

      if (!parsedResult.tests || !Array.isArray(parsedResult.tests)) {
        throw new Error("AI response missing 'tests' array");
      }

      // Validate with Zod
      const { validateLabResult } = require("./schemas/lab.schema");
      const validation = validateLabResult(parsedResult);
      if (!validation.success) {
        throw new Error(
          `AI returned invalid data: ${validation.error.errors
            .map((e: { message: string }) => e.message)
            .join(", ")}`
        );
      }

      await resultRef.set(
        {
          status: "completed",
          ...validation.data,
          processedAt: FieldValue.serverTimestamp(),
          modelUsed: "claude-sonnet-4-5-20250929",
          tokenUsage: {
            input: response.usage?.input_tokens || 0,
            output: response.usage?.output_tokens || 0,
          },
        },
        { merge: true }
      );

      console.log(
        `[LabProcessor] Success: ${parsedResult.tests.length} tests extracted`
      );
    } catch (error) {
      console.error("[LabProcessor] Error:", error);
      await resultRef.set(
        {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          errorAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
);
