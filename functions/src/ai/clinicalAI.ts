import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { callClaude, anthropicApiKey } from "../utils/anthropic";
import { checkRateLimitDetailed } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import {
  WARD_ROUND_BRIEF_SYSTEM_PROMPT,
  WARD_ROUND_BRIEF_USER_PROMPT,
} from "../prompts/wardRoundBrief";
import {
  PROGRESS_NOTE_SYSTEM_PROMPT,
  PROGRESS_NOTE_USER_PROMPT,
} from "../prompts/progressNote";
import {
  DISCHARGE_SUMMARY_SYSTEM_PROMPT,
  DISCHARGE_SUMMARY_USER_PROMPT,
} from "../prompts/dischargeSummary";
import {
  TASK_SUGGESTIONS_SYSTEM_PROMPT,
  TASK_SUGGESTIONS_USER_PROMPT,
} from "../prompts/taskSuggestions";
import {
  LAB_NARRATIVE_SYSTEM_PROMPT,
  LAB_NARRATIVE_USER_PROMPT,
} from "../prompts/labNarrative";

// ---------------------------------------------------------------------------
// Shared: build rich patient context string from Firestore
// ---------------------------------------------------------------------------
async function buildPatientContext(
  db: admin.firestore.Firestore,
  patientId: string
): Promise<string> {
  const [patientDoc, historyDoc, labsSnap, tasksSnap] = await Promise.all([
    db.collection("patients").doc(patientId).get(),
    db
      .collection("patients")
      .doc(patientId)
      .collection("history")
      .doc("current")
      .get(),
    db
      .collection("patients")
      .doc(patientId)
      .collection("labs")
      .orderBy("collectedAt", "desc")
      .limit(5)
      .get(),
    db
      .collection("tasks")
      .where("patientId", "==", patientId)
      .limit(25)
      .get(),
  ]);

  if (!patientDoc.exists) return "";
  const p = patientDoc.data()!;

  const lines: string[] = [
    `Patient: ${p.firstName || ""} ${p.lastName || ""} | Bed ${p.bedNumber || "?"}`,
    `Age/Sex: ${p.dateOfBirth || "Unknown"} | ${p.gender || "Unknown"}`,
    `MRN: ${p.mrn || "Unknown"}`,
    `Acuity: ${p.acuity || "N/A"} | Code Status: ${p.codeStatus || "Full"}`,
    `State: ${p.state || "active"}`,
    `Primary Dx: ${p.primaryDiagnosis || "Unknown"}`,
    `Diagnoses: ${(p.diagnoses || []).join(", ") || "None"}`,
    `Allergies: ${(p.allergies || []).join(", ") || "NKDA"}`,
    `Attending: ${p.attendingPhysician || "Unknown"}`,
    `Ward: ${p.wardId || "Unknown"} | Team: ${p.team || "Unknown"}`,
  ];

  if (p.admissionDate) {
    const admDate =
      typeof p.admissionDate.toDate === "function"
        ? p.admissionDate.toDate()
        : new Date(p.admissionDate);
    const days = Math.ceil(
      (Date.now() - admDate.getTime()) / 86400000
    );
    lines.push(`Admission: ${admDate.toISOString().slice(0, 10)} (Day ${days})`);
  }

  // History
  if (historyDoc.exists) {
    const h = historyDoc.data()!;
    if (h.hpiText) lines.push(`HPI: ${h.hpiText}`);
    if (Array.isArray(h.pmh) && h.pmh.length > 0) {
      lines.push(
        `PMH: ${h.pmh.map((e: { condition: string }) => e.condition).join(", ")}`
      );
    }
    if (Array.isArray(h.medications) && h.medications.length > 0) {
      lines.push(
        `Medications: ${h.medications
          .map(
            (m: { name: string; dose?: string; frequency?: string }) =>
              `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`
          )
          .join("; ")}`
      );
    }
    if (h.assessment) lines.push(`Assessment: ${h.assessment}`);
    if (h.plan) lines.push(`Plan: ${h.plan}`);
  }

  // Labs
  if (!labsSnap.empty) {
    const labLines = labsSnap.docs.map((doc) => {
      const lab = doc.data();
      const vals = (lab.values || [])
        .map(
          (v: {
            name?: string;
            value?: string;
            unit?: string;
            flag?: string;
          }) =>
            `${v.name || ""}=${v.value || ""}${v.unit ? v.unit : ""}${v.flag && v.flag !== "normal" ? `[${v.flag}]` : ""}`
        )
        .join(", ");
      return `  ${lab.panelName || "Lab"}: ${vals}`;
    });
    lines.push(`Recent Labs:\n${labLines.join("\n")}`);
  }

  // Tasks
  const activeTasks = tasksSnap.docs
    .map(
      (doc) =>
        doc.data() as {
          priority?: string;
          title?: string;
          status?: string;
          category?: string;
        }
    )
    .filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

  if (activeTasks.length > 0) {
    const taskLines = activeTasks
      .slice(0, 10)
      .map((t) => `  - [${t.priority || "medium"}] ${t.title || ""}`);
    lines.push(`Active Tasks:\n${taskLines.join("\n")}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Ward Round Brief — generates briefs for multiple patients
// ---------------------------------------------------------------------------
export const generateWardRoundBrief = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const { patientIds } = request.data;

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      throw new HttpsError("invalid-argument", "Patient IDs required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "ai-analysis");
    if (!limitResult.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil(limitResult.retryAfterMs / 1000)}s.`
      );
    }

    try {
      const db = admin.firestore();
      const contexts = await Promise.all(
        patientIds
          .slice(0, 20)
          .map((id: string) => buildPatientContext(db, id))
      );
      const combined = contexts.filter(Boolean).join("\n\n---\n\n");

      const response = await callClaude(
        WARD_ROUND_BRIEF_SYSTEM_PROMPT,
        WARD_ROUND_BRIEF_USER_PROMPT(combined),
        4096
      );

      await logAuditEvent(
        "ward-round-brief",
        uid,
        request.auth.token.email || "",
        "ai",
        "ward-round-brief",
        {
          patientCount: patientIds.length,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("Ward round brief error:", error);
      throw new HttpsError("internal", "Failed to generate ward round brief");
    }
  }
);

// ---------------------------------------------------------------------------
// Progress Note — generates APSO note for one patient
// ---------------------------------------------------------------------------
export const generateProgressNote = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const { patientId, subjective } = request.data;

    if (!patientId || typeof patientId !== "string") {
      throw new HttpsError("invalid-argument", "Patient ID required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "ai-analysis");
    if (!limitResult.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil(limitResult.retryAfterMs / 1000)}s.`
      );
    }

    try {
      const db = admin.firestore();
      const context = await buildPatientContext(db, patientId);

      const response = await callClaude(
        PROGRESS_NOTE_SYSTEM_PROMPT,
        PROGRESS_NOTE_USER_PROMPT(context, subjective),
        3072
      );

      await logAuditEvent(
        "progress-note",
        uid,
        request.auth.token.email || "",
        "ai",
        "progress-note",
        {
          patientId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("Progress note error:", error);
      throw new HttpsError("internal", "Failed to generate progress note");
    }
  }
);

// ---------------------------------------------------------------------------
// Discharge Summary — draft from full admission data
// ---------------------------------------------------------------------------
export const generateDischargeSummary = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const { patientId } = request.data;

    if (!patientId || typeof patientId !== "string") {
      throw new HttpsError("invalid-argument", "Patient ID required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "ai-analysis");
    if (!limitResult.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil(limitResult.retryAfterMs / 1000)}s.`
      );
    }

    try {
      const db = admin.firestore();
      const context = await buildPatientContext(db, patientId);

      // Also fetch completed tasks for hospital course narrative
      const completedTasksSnap = await db
        .collection("tasks")
        .where("patientId", "==", patientId)
        .where("status", "==", "completed")
        .orderBy("completedAt", "desc")
        .limit(30)
        .get();

      let fullContext = context;
      if (!completedTasksSnap.empty) {
        const completedLines = completedTasksSnap.docs.map((doc) => {
          const t = doc.data();
          return `  - ${t.title || ""} (${t.category || ""})`;
        });
        fullContext += `\n\nCompleted Tasks (hospital course events):\n${completedLines.join("\n")}`;
      }

      const response = await callClaude(
        DISCHARGE_SUMMARY_SYSTEM_PROMPT,
        DISCHARGE_SUMMARY_USER_PROMPT(fullContext),
        4096
      );

      await logAuditEvent(
        "discharge-summary",
        uid,
        request.auth.token.email || "",
        "ai",
        "discharge-summary",
        {
          patientId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("Discharge summary error:", error);
      throw new HttpsError("internal", "Failed to generate discharge summary");
    }
  }
);

// ---------------------------------------------------------------------------
// Task Suggestions — AI suggests tasks based on patient state
// ---------------------------------------------------------------------------
export const suggestTasks = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const { patientId } = request.data;

    if (!patientId || typeof patientId !== "string") {
      throw new HttpsError("invalid-argument", "Patient ID required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "ai-analysis");
    if (!limitResult.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil(limitResult.retryAfterMs / 1000)}s.`
      );
    }

    try {
      const db = admin.firestore();
      const context = await buildPatientContext(db, patientId);

      // Get existing active tasks to avoid duplicates
      const tasksSnap = await db
        .collection("tasks")
        .where("patientId", "==", patientId)
        .get();
      const existingTasks = tasksSnap.docs
        .map((d) => d.data())
        .filter(
          (t) => t.status !== "completed" && t.status !== "cancelled"
        )
        .map((t) => `- ${t.title || ""}`)
        .join("\n");

      const response = await callClaude(
        TASK_SUGGESTIONS_SYSTEM_PROMPT,
        TASK_SUGGESTIONS_USER_PROMPT(context, existingTasks),
        1024
      );

      await logAuditEvent(
        "task-suggestions",
        uid,
        request.auth.token.email || "",
        "ai",
        "task-suggestions",
        {
          patientId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      // Parse JSON array from response
      let suggestions = [];
      try {
        suggestions = JSON.parse(response.content);
      } catch {
        // If JSON parse fails, return raw content
        suggestions = [];
      }

      return { suggestions, usage: response.usage };
    } catch (error) {
      console.error("Task suggestions error:", error);
      throw new HttpsError("internal", "Failed to generate task suggestions");
    }
  }
);

// ---------------------------------------------------------------------------
// Lab Narrative — AI interprets lab trends
// ---------------------------------------------------------------------------
export const generateLabNarrative = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const { patientId, labData } = request.data;

    if (!patientId || typeof patientId !== "string") {
      throw new HttpsError("invalid-argument", "Patient ID required");
    }

    const limitResult = await checkRateLimitDetailed(uid, "ai-analysis");
    if (!limitResult.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${Math.ceil(limitResult.retryAfterMs / 1000)}s.`
      );
    }

    try {
      const db = admin.firestore();

      // Build patient context (diagnoses, meds, allergies)
      const patientDoc = await db.collection("patients").doc(patientId).get();
      const p = patientDoc.exists ? patientDoc.data()! : {};
      const patientContext = [
        `Primary Dx: ${p.primaryDiagnosis || "Unknown"}`,
        `Diagnoses: ${(p.diagnoses || []).join(", ") || "None"}`,
        `Allergies: ${(p.allergies || []).join(", ") || "NKDA"}`,
        `Acuity: ${p.acuity || "N/A"}`,
      ].join("\n");

      const response = await callClaude(
        LAB_NARRATIVE_SYSTEM_PROMPT,
        LAB_NARRATIVE_USER_PROMPT(
          typeof labData === "string" ? labData : JSON.stringify(labData),
          patientContext
        ),
        1024
      );

      await logAuditEvent(
        "lab-narrative",
        uid,
        request.auth.token.email || "",
        "ai",
        "lab-narrative",
        {
          patientId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        }
      );

      return response;
    } catch (error) {
      console.error("Lab narrative error:", error);
      throw new HttpsError("internal", "Failed to generate lab narrative");
    }
  }
);
