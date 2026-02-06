import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { z } from 'zod'

export async function setValidatedDoc<T>(
  path: string,
  data: unknown,
  schema: z.ZodType<T>
): Promise<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }

  const segments = path.split('/')
  const docRef = doc(db, segments[0], ...segments.slice(1))
  await setDoc(docRef, result.data as Record<string, unknown>, { merge: true })

  return result.data
}

export async function getValidatedDoc<T>(
  path: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const segments = path.split('/')
  const docRef = doc(db, segments[0], ...segments.slice(1))
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) return null

  const data = snapshot.data()
  const result = schema.safeParse(data)

  if (!result.success) {
    console.error(`[ValidatedFirestore] Invalid document at ${path}:`, result.error.issues)
    return null
  }

  return result.data
}
