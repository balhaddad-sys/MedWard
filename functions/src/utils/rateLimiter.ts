import * as admin from "firebase-admin";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
  blockDurationMs: 60000,
};

const ACTION_CONFIGS: Record<string, RateLimitConfig> = {
  "clinical-chat": { maxRequests: 30, windowMs: 60000, blockDurationMs: 120000 },
  "ai-analysis": { maxRequests: 20, windowMs: 60000, blockDurationMs: 120000 },
  "ai-gateway": { maxRequests: 25, windowMs: 60000, blockDurationMs: 120000 },
  "sbar-generation": { maxRequests: 15, windowMs: 60000, blockDurationMs: 120000 },
  "handover-generation": { maxRequests: 15, windowMs: 60000, blockDurationMs: 120000 },
  "lab-image-analysis": { maxRequests: 10, windowMs: 60000, blockDurationMs: 180000 },
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
  resetAtMs: number;
}

function getResolvedConfig(action: string, override?: RateLimitConfig): RateLimitConfig {
  if (override) return override;
  return ACTION_CONFIGS[action] || DEFAULT_CONFIG;
}

export const checkRateLimitDetailed = async (
  userId: string,
  action: string,
  overrideConfig?: RateLimitConfig
): Promise<RateLimitResult> => {
  const config = getResolvedConfig(action, overrideConfig);
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection("rateLimits").doc(`${userId}_${action}`);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.exists ? doc.data() || {} : {};

    const blockedUntilMs = Number(data.blockedUntilMs || 0);
    if (blockedUntilMs > now) {
      return {
        allowed: false,
        retryAfterMs: blockedUntilMs - now,
        remaining: 0,
        resetAtMs: blockedUntilMs,
      };
    }

    let windowStartMs = Number(data.windowStartMs || now);
    let count = Number(data.count || 0);

    // Reset window if elapsed
    if (now - windowStartMs >= config.windowMs) {
      windowStartMs = now;
      count = 0;
    }

    if (count >= config.maxRequests) {
      const resetAtMs = windowStartMs + config.windowMs;
      const blockedUntil = config.blockDurationMs
        ? Math.max(now + config.blockDurationMs, resetAtMs)
        : resetAtMs;

      tx.set(ref, {
        action,
        userId,
        windowStartMs,
        count,
        blockedUntilMs: blockedUntil,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        allowed: false,
        retryAfterMs: Math.max(1, blockedUntil - now),
        remaining: 0,
        resetAtMs: blockedUntil,
      };
    }

    const nextCount = count + 1;
    const remaining = Math.max(0, config.maxRequests - nextCount);
    const resetAtMs = windowStartMs + config.windowMs;

    tx.set(ref, {
      action,
      userId,
      windowStartMs,
      count: nextCount,
      blockedUntilMs: admin.firestore.FieldValue.delete(),
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRequestAtMs: now,
    }, { merge: true });

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining,
      resetAtMs,
    };
  });
};

export const checkRateLimit = async (
  userId: string,
  action: string,
  config?: RateLimitConfig
): Promise<boolean> => {
  const result = await checkRateLimitDetailed(userId, action, config);
  return result.allowed;
};

export const cleanupOldRateLimitEntries = async (maxAgeMs: number): Promise<number> => {
  const db = admin.firestore();
  const threshold = Date.now() - maxAgeMs;
  const staleQuery = await db
    .collection("rateLimits")
    .where("lastRequestAtMs", "<=", threshold)
    .limit(400)
    .get();

  if (staleQuery.empty) {
    return 0;
  }

  const batch = db.batch();
  staleQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return staleQuery.size;
};
