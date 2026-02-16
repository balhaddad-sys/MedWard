import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimitDetailed } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { HANDOVER_SYSTEM_PROMPT } from "../prompts/handover";

export const generateHandover = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email || "";
    const { wardId } = request.data;

    if (!wardId || typeof wardId !== "string") {
      throw new HttpsError("invalid-argument", "Ward ID is required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "handover-generation");
    if (!limitResult.allowed) {
      const retryAfterSec = Math.ceil(limitResult.retryAfterMs / 1000);
      throw new HttpsError("resource-exhausted", `Rate limit exceeded. Try again in ${retryAfterSec}s.`);
    }

    try {
      const db = admin.firestore();

      const patientsSnap = await db
        .collection("patients")
        .where("wardId", "==", wardId)
        .get();

      if (patientsSnap.empty) {
        return { content: "No patients found in this ward.", usage: { inputTokens: 0, outputTokens: 0 } };
      }

      const authorizedPatients = patientsSnap.docs
        .filter((doc) => {
          const data = doc.data();
          const createdBy = typeof data.createdBy === "string" ? data.createdBy : "";
          const assignedClinicians = Array.isArray(data.assignedClinicians) ? data.assignedClinicians : [];
          return createdBy === uid || assignedClinicians.includes(uid);
        })
        .sort((a, b) => {
          const acuityA = typeof a.data().acuity === "number" ? a.data().acuity : 999;
          const acuityB = typeof b.data().acuity === "number" ? b.data().acuity : 999;
          return acuityA - acuityB; // critical first (1 is highest acuity)
        });

      if (authorizedPatients.length === 0) {
        return {
          content: "No patients found in this ward that you have access to.",
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      }

      const authorizedCount = authorizedPatients.length;

      // Build summaries in parallel (faster than serial N+1 loop)
      const patientSummaries = await Promise.all(
        authorizedPatients.map(async (patientDoc) => {
          const patient = patientDoc.data();

          const parts: string[] = [
            `--- Patient: ${patient.firstName || ""} ${patient.lastName || ""} (Bed ${patient.bedNumber || "?"}) ---`,
            `Acuity: ${patient.acuity || "N/A"} | Code Status: ${patient.codeStatus || "Unknown"}`,
            `Primary Dx: ${patient.primaryDiagnosis || "Unknown"}`,
            `Diagnoses: ${(patient.diagnoses || []).join(", ") || "None"}`,
            `Allergies: ${(patient.allergies || []).join(", ") || "NKDA"}`,
            `Attending: ${patient.attendingPhysician || "Unknown"}`,
          ];

          const [historyDoc, labsSnap, tasksSnap] = await Promise.all([
            db.collection("patients").doc(patientDoc.id).collection("history").doc("current").get(),
            db.collection("patients").doc(patientDoc.id).collection("labs").orderBy("collectedAt", "desc").limit(5).get(),
            db.collection("tasks").where("patientId", "==", patientDoc.id).limit(25).get(),
          ]);

          if (historyDoc.exists) {
            const history = historyDoc.data()!;
            const historyLines: string[] = [];
            if (Array.isArray(history.pmh) && history.pmh.length > 0) {
              historyLines.push(`  PMH: ${history.pmh.map((h: { condition: string }) => h.condition).join(", ")}`);
            }
            if (Array.isArray(history.medications) && history.medications.length > 0) {
              historyLines.push(
                `  Meds: ${history.medications
                  .map((m: { name: string; dose?: string }) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`)
                  .join(", ")}`
              );
            }
            if (historyLines.length > 0) {
              parts.push(`History:\n${historyLines.join("\n")}`);
            }
          }

          if (!labsSnap.empty) {
            const labLines = labsSnap.docs.map((doc) => {
              const lab = doc.data();
              const abnormal = (lab.values || [])
                .filter((v: { flag?: string }) => v.flag && v.flag !== "normal")
                .map((v: { name?: string; value?: string; unit?: string; flag?: string }) =>
                  `${v.name || ""}=${v.value || ""}${v.unit || ""}[${v.flag || ""}]`
                )
                .join(", ");
              return `  ${lab.panelName || "Unknown"}: ${abnormal || "all normal"}`;
            });
            parts.push(`Recent Labs:\n${labLines.join("\n")}`);
          }

          const activeTasks = tasksSnap.docs
            .map((doc) => doc.data() as { priority?: string; title?: string; status?: string })
            .filter((task) => task.status !== "completed" && task.status !== "cancelled")
            .slice(0, 10);

          if (activeTasks.length > 0) {
            const taskLines = activeTasks.map(
              (task) => `  - [${task.priority || "medium"}] ${task.title || ""}`
            );
            parts.push(`Active Tasks:\n${taskLines.join("\n")}`);
          }

          return parts.join("\n");
        })
      );

      const fullContext = patientSummaries.join("\n\n");
      const userPrompt = `Generate a shift handover summary for the following ${authorizedCount} ward patients:\n\n${fullContext}`;

      const response = await callClaude(HANDOVER_SYSTEM_PROMPT, userPrompt, 4096);

      await logAuditEvent(
        "handover-generation",
        uid,
        email,
        "ai",
        "handover",
        {
          wardId,
          patientCount: authorizedCount,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("Handover generation error:", error);
      throw new HttpsError("internal", "Failed to generate handover summary");
    }
  }
);
