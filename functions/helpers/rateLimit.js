/**
 * MedWard Pro — Rate Limiter
 * Simple per-user rate limiting using Firestore
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');

const db = getFirestore();
const RATE_LIMIT_COLLECTION = 'rateLimits';

/**
 * Check and increment rate limit for a user
 * @param {string} uid - User ID
 * @param {string} functionName - Function being called
 * @returns {Promise<void>} Throws if rate limited
 */
async function checkRateLimit(uid, functionName) {
  const limit = UNIFIED_CONFIG.rateLimits[functionName];
  if (!limit) return; // No limit configured

  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(`${uid}_${functionName}`);
  const now = Date.now();
  const windowMs = 3600000; // 1 hour

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const data = doc.data();

      if (!data || (now - data.windowStart) > windowMs) {
        // New window
        transaction.set(docRef, {
          count: 1,
          windowStart: now,
          uid,
          functionName,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { allowed: true, remaining: limit - 1 };
      }

      if (data.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: data.windowStart + windowMs };
      }

      transaction.update(docRef, {
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { allowed: true, remaining: limit - data.count - 1 };
    });

    if (!result.allowed) {
      const resetIn = Math.ceil((result.resetAt - now) / 60000);
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit reached for ${functionName}. Try again in ${resetIn} minutes.`
      );
    }
  } catch (err) {
    if (err.code === 'resource-exhausted') throw err;
    // Don't block requests if rate limiter fails
    console.warn('Rate limit check failed:', err.message);
  }
}

module.exports = { checkRateLimit };
