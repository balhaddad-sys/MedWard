import * as admin from "firebase-admin";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
};

export const checkRateLimit = async (
  userId: string,
  action: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<boolean> => {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const ref = db.collection("rateLimits").doc(`${userId}_${action}`);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);

    if (!doc.exists) {
      tx.set(ref, {
        requests: [now],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    }

    const data = doc.data()!;
    const requests: number[] = (data.requests || []).filter(
      (t: number) => t > windowStart
    );

    if (requests.length >= config.maxRequests) {
      return false;
    }

    requests.push(now);
    tx.update(ref, {
      requests,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });
};
