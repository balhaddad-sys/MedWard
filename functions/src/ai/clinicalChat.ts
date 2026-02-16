import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimitDetailed } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { CLINICAL_CHAT_SYSTEM_PROMPT, CLINICAL_CHAT_WITH_CONTEXT } from "../prompts/clinicalChat";

export const clinicalChat = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { message, conversationHistory, patientId } = request.data;

    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "Message is required");
    }

    if (message.length > 10000) {
      throw new HttpsError("invalid-argument", "Message exceeds maximum length of 10,000 characters");
    }

    const limitResult = await checkRateLimitDetailed(request.auth.uid, "clinical-chat");
    if (!limitResult.allowed) {
      const retryAfterSec = Math.ceil(limitResult.retryAfterMs / 1000);
      throw new HttpsError("resource-exhausted", `Rate limit exceeded. Try again in ${retryAfterSec}s.`);
    }

    try {
      // Build patient context from Firestore if patientId is provided
      let systemPrompt = CLINICAL_CHAT_SYSTEM_PROMPT;

      if (patientId && typeof patientId === "string") {
        const db = admin.firestore();
        const patientDoc = await db.collection("patients").doc(patientId).get();

        if (patientDoc.exists) {
          const patient = patientDoc.data()!;

          // SECURITY FIX: Verify user has access to this patient
          const createdBy = patient.createdBy || "";
          const assignedClinicians = patient.assignedClinicians || [];
          if (createdBy !== request.auth.uid && !assignedClinicians.includes(request.auth.uid)) {
            throw new HttpsError(
              "permission-denied",
              "You do not have permission to access this patient's data"
            );
          }
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

          // Fetch patient history document
          const historyDoc = await db
            .collection("patients")
            .doc(patientId)
            .collection("history")
            .doc("current")
            .get();

          if (historyDoc.exists) {
            const history = historyDoc.data()!;
            const historyParts: string[] = [];

            if (history.hpiText) {
              historyParts.push(`HPI: ${history.hpiText}`);
            }
            if (Array.isArray(history.pmh) && history.pmh.length > 0) {
              historyParts.push(`PMH: ${history.pmh.map((h: { condition: string; status?: string }) => `${h.condition}${h.status ? ` (${h.status})` : ""}`).join(", ")}`);
            }
            if (Array.isArray(history.psh) && history.psh.length > 0) {
              historyParts.push(`PSH: ${history.psh.map((s: { procedure: string; year?: string }) => `${s.procedure}${s.year ? ` (${s.year})` : ""}`).join(", ")}`);
            }
            if (Array.isArray(history.medications) && history.medications.length > 0) {
              historyParts.push(`Medications: ${history.medications.map((m: { name: string; dose?: string; route?: string; frequency?: string }) => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.route ? ` ${m.route}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`).join("; ")}`);
            }
            if (history.socialHistory) {
              const sh = history.socialHistory;
              const shParts: string[] = [];
              if (sh.smoking) shParts.push(`Smoking: ${sh.smoking}`);
              if (sh.alcohol) shParts.push(`Alcohol: ${sh.alcohol}`);
              if (sh.occupation) shParts.push(`Occupation: ${sh.occupation}`);
              if (sh.livingSituation) shParts.push(`Living: ${sh.livingSituation}`);
              if (shParts.length > 0) historyParts.push(`Social Hx: ${shParts.join(", ")}`);
            }
            if (Array.isArray(history.familyHistory) && history.familyHistory.length > 0) {
              historyParts.push(`Family Hx: ${history.familyHistory.map((f: { relation: string; condition: string }) => `${f.relation}: ${f.condition}`).join("; ")}`);
            }

            if (historyParts.length > 0) {
              contextParts.push(`\nPatient History:\n${historyParts.join("\n")}`);
            }
          }

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

          // Fetch tasks for patient (filter status client-side to avoid composite index)
          const tasksSnap = await db
            .collection("tasks")
            .where("patientId", "==", patientId)
            .limit(20)
            .get();

          if (!tasksSnap.empty) {
            // Filter to active tasks only
            const activeTasks = tasksSnap.docs
              .map((doc) => doc.data())
              .filter((task) => task.status !== "completed" && task.status !== "cancelled")
              .slice(0, 10);

            if (activeTasks.length > 0) {
              const taskLines = activeTasks.map((task) => {
                return `- [${task.priority || "medium"}] ${task.title || ""}`;
              });
              contextParts.push(`\nActive Tasks:\n${taskLines.join("\n")}`);
            }
          }

          systemPrompt = CLINICAL_CHAT_WITH_CONTEXT(contextParts.join("\n"));
        }
      }

      // Build messages array for multi-turn conversation (bounded to prevent abuse)
      const MAX_HISTORY_MESSAGES = 20;
      const MAX_TOTAL_CHARS = 50000;
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      if (Array.isArray(conversationHistory)) {
        const recent = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
        let totalChars = 0;
        for (const msg of recent) {
          if (
            msg &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            (msg.role === "user" || msg.role === "assistant")
          ) {
            const content = msg.content.slice(0, 5000);
            totalChars += content.length;
            if (totalChars > MAX_TOTAL_CHARS) break;
            messages.push({ role: msg.role, content });
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

      if (error instanceof HttpsError) {
        throw error; // preserve permission-denied / invalid-argument / unauthenticated
      }

      throw new HttpsError("internal", "Failed to process clinical chat request");
    }
  }
);
