import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { OnCallJob, JobStatus, JobPriority } from '@/types/onCall'

const COLLECTION = 'on_call_jobs'

const STATUS_ORDER: Record<JobStatus, number> = { pending: 0, in_progress: 1, done: 2, handed_over: 3 }
const PRIORITY_ORDER: Record<JobPriority, number> = { critical: 0, urgent: 1, routine: 2 }

export function subscribeToOnCallJobs(
  userId: string,
  callback: (jobs: OnCallJob[]) => void,
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where('createdBy', '==', userId))

  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as OnCallJob))
      jobs.sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (statusDiff !== 0) return statusDiff
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        const aMs = a.receivedAt?.toMillis?.() ?? 0
        const bMs = b.receivedAt?.toMillis?.() ?? 0
        return aMs - bMs // Oldest first within same priority/status
      })
      callback(jobs)
    },
    (error) => {
      console.error('❌ Error in on-call jobs subscription:', error)
      callback([])
    },
  )
}

export async function addOnCallJob(
  userId: string,
  data: {
    patientName: string
    ward: string
    bed?: string
    calledBy?: string
    reason: string
    priority: JobPriority
  },
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'pending' as JobStatus,
    escalated: false,
    createdBy: userId,
    receivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  opts?: { actionNote?: string },
): Promise<void> {
  const updates: Record<string, unknown> = { status, updatedAt: serverTimestamp() }
  if (status === 'in_progress') updates.startedAt = serverTimestamp()
  if (status === 'done' || status === 'handed_over') updates.completedAt = serverTimestamp()
  if (opts?.actionNote !== undefined) updates.actionNote = opts.actionNote
  await updateDoc(doc(db, COLLECTION, jobId), updates)
}

export async function updateJobNote(jobId: string, actionNote: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, jobId), { actionNote, updatedAt: serverTimestamp() })
}
