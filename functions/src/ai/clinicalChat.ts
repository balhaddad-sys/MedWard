import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { CLINICAL_CHAT_SYSTEM_PROMPT, CLINICAL_CHAT_WITH_CONTEXT } from "../prompts/clinicalChat";

export const clinicalChat = onCall(
  { secrets: [anthropicApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { message, conversationHistory, patientId } = request.data;

    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "Message is required");
    }

    const allowed = await checkRateLimit(request.auth.uid, "clinical-chat");
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
    }

    try {
      // Build patient context from Firestore if patientId is provided
      let systemPrompt = CLINICAL_CHAT_SYSTEM_PROMPT;

      if (patientId && typeof patientId === "string") {
        const db = admin.firestore();
        const patientDoc = await db.collection("patients").doc(patientId).get();

        if (patientDoc.exists) {
          const patient = patientDoc.data()!;
          const contextParts: string[] = [
            `Name: ${patient.firstName} ${patient.lastName}`,
            `DOB: ${patient.dateOfBirth || "Unknown"}`,
            `Gender: ${patient.gender || "Unknown"}`,
            `Primary Diagnosis: ${patient.primaryDiagnosis || "Unknown"}`,
            `Diagnoses: ${(patient.diagnoses || []).join(", ") || "None listed"}`,
            `Allergies: ${(patient.allergies || []).join(", ") || "NKDA"}`,
            `Code Status: ${patient.codeStatus || "Unknown"}`,
            `Acuity: ${patient.acuity || "N/A"}`,
          ];

          // Fetch recent labs
          const labsSnap = await db
            .collection("patients")
            .doc(patientId)
            .collection("labs")
            .orderBy("collectedAt", "desc")
            .limit(5)
            .get();

          if (!labsSnap.empty) {
            const labLines = labsSnap.docs.map((doc) => {
              const lab = doc.data();
              const abnormal = (lab.values || [])
                .filter((v: { flag?: string }) => v.flag && v.flag !== "normal")
                .map((v: { name?: string; value?: string; unit?: string; flag?: string }) =>
                  `${v.name || ""}=${v.value || ""}${v.unit || ""}[${v.flag || ""}]`
                )
                .join(", ");
              return `${lab.panelName || "Unknown"}: ${abnormal || "all normal"}`;
            });
            contextParts.push(`\nRecent Labs:\n${labLines.join("\n")}`);
          }

          // Fetch active tasks
          const tasksSnap = await db
            .collection("tasks")
            .where("patientId", "==", patientId)
            .where("status", "!=", "completed")
            .limit(10)
            .get();

          if (!tasksSnap.empty) {
            const taskLines = tasksSnap.docs.map((doc) => {
              const task = doc.data();
              return `- [${task.priority || "medium"}] ${task.title || ""}`;
            });
            contextParts.push(`\nActive Tasks:\n${taskLines.join("\n")}`);
          }

          systemPrompt = CLINICAL_CHAT_WITH_CONTEXT(contextParts.join("\n"));
        }
      }

      // Build messages array for multi-turn conversation
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      if (Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          if (
            msg &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            (msg.role === "user" || msg.role === "assistant")
          ) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      messages.push({ role: "user", content: message });

      const response = await callClaude(
        systemPrompt,
        messages,
        4096
      );

      await logAuditEvent(
        "clinical-chat",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "chat",
        { inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, patientId: patientId || null }
      );

      return response;
    } catch (error) {
      console.error("Clinical chat error:", error);
      throw new HttpsError("internal", "Failed to process clinical chat request");
    }
  }
);
