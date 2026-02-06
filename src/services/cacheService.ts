import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { getFeatureFlag } from '@/config/remoteConfig'

const CACHE_COLLECTION = 'ai_query_cache'
const CACHE_MAX_AGE_DAYS = 7

function normalizeQuery(queryText: string): string {
  return queryText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCacheKey(normalizedQuery: string): string {
  let hash = 0
  for (let i = 0; i < normalizedQuery.length; i++) {
    const char = normalizedQuery.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `q_${Math.abs(hash).toString(36)}`
}

export async function getCachedResponse(queryText: string): Promise<string | null> {
  if (!getFeatureFlag('enable_semantic_cache')) return null

  const normalized = normalizeQuery(queryText)
  const cacheKey = getCacheKey(normalized)

  try {
    const cacheRef = doc(db, CACHE_COLLECTION, cacheKey)
    const snapshot = await getDoc(cacheRef)

    if (!snapshot.exists()) return null

    const cached = snapshot.data()

    const cachedAt = cached.cachedAt?.toDate()
    if (cachedAt) {
      const ageMs = Date.now() - cachedAt.getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      if (ageDays > CACHE_MAX_AGE_DAYS) return null
    }

    await setDoc(cacheRef, {
      hitCount: (cached.hitCount || 0) + 1,
      lastHitAt: serverTimestamp(),
    }, { merge: true })

    return cached.response as string
  } catch (error) {
    console.error('[Cache] Read error:', error)
    return null
  }
}

export async function setCachedResponse(
  queryText: string,
  response: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!getFeatureFlag('enable_semantic_cache')) return

  const normalized = normalizeQuery(queryText)
  const cacheKey = getCacheKey(normalized)

  try {
    const cacheRef = doc(db, CACHE_COLLECTION, cacheKey)
    await setDoc(cacheRef, {
      normalizedQuery: normalized,
      originalQuery: queryText,
      response,
      cachedAt: serverTimestamp(),
      hitCount: 0,
      ...metadata,
    })
  } catch (error) {
    console.error('[Cache] Write error:', error)
  }
}

export async function seedCommonQueries(): Promise<void> {
  const commonQueries = [
    {
      query: 'vancomycin dosing',
      response: `Vancomycin Dosing Guidelines:\n\nLoading Dose: 25-30 mg/kg (actual body weight)\nMaintenance: 15-20 mg/kg every 8-12 hours\n\nRenal Adjustment Required:\n- CrCl >50: q8-12h\n- CrCl 20-49: q24h\n- CrCl <20: q48-72h or based on levels\n\nTarget Trough: 15-20 mcg/mL (serious infections)\n\nAlways verify with pharmacy and check renal function.`,
    },
    {
      query: 'sepsis bundle',
      response: `Sepsis 1-Hour Bundle (SEP-1):\n\n1. Lactate - Measure, remeasure if >2\n2. Blood Cultures - Before antibiotics\n3. Broad-spectrum Antibiotics - Within 1 hour\n4. Crystalloid Fluid - 30 mL/kg for hypotension or lactate >=4\n5. Vasopressors - If hypotensive after fluids (target MAP >=65)\n\nDocument time of recognition as "Time Zero"`,
    },
  ]

  for (const item of commonQueries) {
    await setCachedResponse(item.query, item.response, { seeded: true })
  }
}
