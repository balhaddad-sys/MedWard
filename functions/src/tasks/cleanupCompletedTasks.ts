import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 400;

export const cleanupCompletedTasks = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - DAY_MS);

    let deletedCount = 0;

    while (true) {
      const snap = await db
        .collection("tasks")
        .where("completedAt", "<=", cutoff)
        .limit(BATCH_LIMIT)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      deletedCount += snap.size;

      if (snap.size < BATCH_LIMIT) break;
    }

    logger.info("cleanupCompletedTasks finished", {
      cutoff: cutoff.toDate().toISOString(),
      deletedCount,
    });
  }
);
