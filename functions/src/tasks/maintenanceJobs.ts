import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { gzipSync } from "node:zlib";
import { cleanupOldRateLimitEntries } from "../utils/rateLimiter";

const RATE_LIMIT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BACKUP_RETENTION_DAYS = 30;
const BACKUP_PAGE_SIZE = 500;
const BACKUP_MAX_DOCS_PER_COLLECTION = 10000;
const BACKUP_COLLECTIONS = ["patients", "tasks", "onCallList", "alerts", "users"] as const;
type FirebaseBucket = ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

type BackupCollectionName = (typeof BACKUP_COLLECTIONS)[number];

async function readCollectionSnapshot(
  db: admin.firestore.Firestore,
  collectionName: BackupCollectionName
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let lastDocId: string | null = null;

  while (results.length < BACKUP_MAX_DOCS_PER_COLLECTION) {
    let query = db
      .collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BACKUP_PAGE_SIZE);

    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snap = await query.get();
    if (snap.empty) {
      break;
    }

    snap.docs.forEach((doc) => {
      if (results.length < BACKUP_MAX_DOCS_PER_COLLECTION) {
        results.push({ id: doc.id, ...doc.data() });
      }
    });

    lastDocId = snap.docs[snap.docs.length - 1]?.id || null;
    if (snap.size < BACKUP_PAGE_SIZE) {
      break;
    }
  }

  return results;
}

async function purgeExpiredBackupFiles(bucket: FirebaseBucket): Promise<number> {
  const retentionCutoffMs = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const [files] = await bucket.getFiles({ prefix: "backups/clinical/" });

  let deletedCount = 0;
  for (const file of files) {
    const createdAt = file.metadata.timeCreated ? Date.parse(file.metadata.timeCreated) : NaN;
    if (!Number.isFinite(createdAt) || createdAt > retentionCutoffMs) {
      continue;
    }
    await file.delete({ ignoreNotFound: true });
    deletedCount += 1;
  }

  return deletedCount;
}

export const cleanupRateLimitDocuments = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "UTC",
    region: "us-central1",
  },
  async () => {
    let deletedTotal = 0;

    while (true) {
      const deleted = await cleanupOldRateLimitEntries(RATE_LIMIT_MAX_AGE_MS);
      deletedTotal += deleted;
      if (deleted < 400) {
        break;
      }
    }

    logger.info("cleanupRateLimitDocuments completed", {
      deletedCount: deletedTotal,
      maxAgeMs: RATE_LIMIT_MAX_AGE_MS,
    });
  }
);

export const backupClinicalSnapshot = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "UTC",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async () => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const nowIso = new Date().toISOString();

    const snapshot: {
      generatedAt: string;
      version: number;
      collections: Record<BackupCollectionName, Record<string, unknown>[]>;
    } = {
      generatedAt: nowIso,
      version: 1,
      collections: {
        patients: [],
        tasks: [],
        onCallList: [],
        alerts: [],
        users: [],
      },
    };

    for (const collectionName of BACKUP_COLLECTIONS) {
      const docs = await readCollectionSnapshot(db, collectionName);
      snapshot.collections[collectionName] = docs;
    }

    const jsonPayload = JSON.stringify(snapshot);
    const compressedPayload = gzipSync(Buffer.from(jsonPayload, "utf-8"));

    const fileName = `backups/clinical/${nowIso.replace(/[:.]/g, "-")}.json.gz`;
    const file = bucket.file(fileName);
    await file.save(compressedPayload, {
      contentType: "application/json",
      metadata: {
        contentEncoding: "gzip",
        cacheControl: "no-store",
      },
      resumable: false,
    });

    const deletedOldBackups = await purgeExpiredBackupFiles(bucket);

    await db.collection("systemBackups").add({
      fileName,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      retentionDays: BACKUP_RETENTION_DAYS,
      deletedOldBackups,
      stats: BACKUP_COLLECTIONS.reduce<Record<string, number>>((acc, collectionName) => {
        const docs = snapshot.collections[collectionName] || [];
        acc[collectionName] = docs.length;
        return acc;
      }, {}),
    });

    logger.info("backupClinicalSnapshot completed", {
      fileName,
      payloadBytes: compressedPayload.length,
      deletedOldBackups,
    });
  }
);
