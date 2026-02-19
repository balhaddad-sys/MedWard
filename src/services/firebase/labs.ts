import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/config/firebase'
import type { LabPanel } from '@/types'

const safeLabPanel = (id: string, data: Record<string, unknown>): LabPanel => ({
  patientId: '',
  category: 'MISC',
  panelName: 'Unknown',
  values: [],
  status: 'pending',
  orderedBy: '',
  source: 'manual',
  ...data,
  id,
} as unknown as LabPanel)

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}

const deepStripUndefined = (value: unknown): unknown => {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => deepStripUndefined(item))
      .filter((item) => item !== undefined)
    return cleanedArray
  }

  if (isPlainObject(value)) {
    const cleanedObject: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      const cleanedNested = deepStripUndefined(nested)
      if (cleanedNested !== undefined) {
        cleanedObject[key] = cleanedNested
      }
    }
    return cleanedObject
  }

  return value
}

const findUndefinedPaths = (value: unknown, currentPath = ''): string[] => {
  if (value === undefined) {
    return [currentPath || '<root>']
  }

  if (Array.isArray(value)) {
    const paths: string[] = []
    value.forEach((item, index) => {
      paths.push(...findUndefinedPaths(item, `${currentPath}[${index}]`))
    })
    return paths
  }

  if (isPlainObject(value)) {
    const paths: string[] = []
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key
      paths.push(...findUndefinedPaths(nested, nextPath))
    }
    return paths
  }

  return []
}

export const getLabPanels = async (patientId: string, maxResults = 50): Promise<LabPanel[]> => {
  const q = query(
    collection(db, 'patients', patientId, 'labs'),
    orderBy('collectedAt', 'desc'),
    limit(maxResults)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safeLabPanel(doc.id, doc.data()))
}

export const addLabPanel = async (patientId: string, panel: Omit<LabPanel, 'id' | 'createdAt'>): Promise<string> => {
  const sanitizedPanel = deepStripUndefined(panel) as Record<string, unknown>
  const payload = {
    ...sanitizedPanel,
    createdAt: serverTimestamp(),
  }
  const undefinedPaths = findUndefinedPaths(payload)
  if (undefinedPaths.length > 0) {
    throw new Error(`Lab payload contains undefined fields: ${undefinedPaths.join(', ')}`)
  }

  const docRef = await addDoc(collection(db, 'patients', patientId, 'labs'), payload)
  return docRef.id
}

export const updateLabPanel = async (
  patientId: string,
  labId: string,
  data: Partial<LabPanel>
): Promise<void> => {
  await updateDoc(doc(db, 'patients', patientId, 'labs', labId), data)
}

export const deleteLabPanel = async (
  patientId: string,
  labId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'patients', patientId, 'labs', labId))
}

export const markLabReviewed = async (
  patientId: string,
  labId: string,
  reviewerId: string
): Promise<void> => {
  await updateDoc(doc(db, 'patients', patientId, 'labs', labId), {
    status: 'reviewed',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
  })
}

export const subscribeToLabs = (
  patientId: string,
  callback: (labs: LabPanel[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'patients', patientId, 'labs'),
    orderBy('collectedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const labs = snapshot.docs.map((doc) => safeLabPanel(doc.id, doc.data()))
    callback(labs)
  }, (error) => {
    console.error('Lab subscription error:', error)
    callback([])
  })
}

export const uploadLabImage = async (
  userId: string,
  file: Blob,
  originalName?: string
): Promise<string> => {
  const name = originalName ?? (file instanceof File ? file.name : 'lab.jpg')
  const storageRef = ref(storage, `lab-images/${userId}/${Date.now()}-${name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export const getCriticalLabs = async (wardId: string): Promise<LabPanel[]> => {
  const q = query(
    collection(db, 'patients'),
    where('wardId', '==', wardId)
  )
  const patientsSnap = await getDocs(q)
  const criticalLabs: LabPanel[] = []
  for (const patDoc of patientsSnap.docs) {
    const labsQ = query(
      collection(db, 'patients', patDoc.id, 'labs'),
      where('status', '==', 'resulted'),
      orderBy('collectedAt', 'desc'),
      limit(10)
    )
    const labsSnap = await getDocs(labsQ)
    for (const labDoc of labsSnap.docs) {
      const lab = safeLabPanel(labDoc.id, labDoc.data())
      const hasCritical = (lab.values ?? []).some(
        (v) => v.flag === 'critical_low' || v.flag === 'critical_high'
      )
      if (hasCritical) criticalLabs.push(lab)
    }
  }
  return criticalLabs
}

/**
 * NEW (Phase 2): Get critical unreviewed labs for user's assigned patients
 * Returns lab panels with critical values that haven't been reviewed
 */
export const getCriticalUnreviewedLabs = async (userId: string, teamId: string): Promise<LabPanel[]> => {
  // Get all patients assigned to this user
  const patientsQ = query(
    collection(db, 'patients'),
    where('teamId', '==', teamId),
    where('assignedClinicians', 'array-contains', userId)
  )
  const patientsSnap = await getDocs(patientsQ)
  const criticalUnreviewedLabs: LabPanel[] = []

  // For each patient, get unreviewed critical labs
  for (const patDoc of patientsSnap.docs) {
    const labsQ = query(
      collection(db, 'patients', patDoc.id, 'labs'),
      where('status', '==', 'resulted'), // Resulted but not reviewed
      orderBy('resultedAt', 'desc'),
      limit(5) // Most recent 5 labs per patient
    )
    const labsSnap = await getDocs(labsQ)

    for (const labDoc of labsSnap.docs) {
      const lab = safeLabPanel(labDoc.id, { ...labDoc.data(), patientId: patDoc.id })

      // Check if lab has critical values AND is not reviewed
      const hasCritical = (lab.values ?? []).some(
        (v) => v.flag === 'critical_low' || v.flag === 'critical_high'
      )

      if (hasCritical && !lab.reviewedAt) {
        criticalUnreviewedLabs.push(lab)
      }
    }
  }

  return criticalUnreviewedLabs
}
