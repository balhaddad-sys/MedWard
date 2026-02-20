import type { Timestamp } from 'firebase/firestore'

export type JobPriority = 'critical' | 'urgent' | 'routine'
export type JobStatus = 'pending' | 'in_progress' | 'done' | 'handed_over'

export interface OnCallJob {
  id: string
  patientName: string
  ward: string
  bed?: string
  calledBy?: string
  reason: string
  priority: JobPriority
  status: JobStatus
  receivedAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  actionNote?: string
  escalated: boolean
  escalationNote?: string
  createdBy: string
  updatedAt: Timestamp
}
