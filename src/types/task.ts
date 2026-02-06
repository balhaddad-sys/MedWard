import type { Timestamp } from 'firebase/firestore'

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskCategory = 'medication' | 'lab' | 'imaging' | 'consult' | 'procedure' | 'nursing' | 'discharge' | 'other'

export interface Task {
  id: string
  patientId: string
  patientName: string
  bedNumber: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  assignedTo: string
  assignedToName: string
  createdBy: string
  createdByName: string
  dueAt?: Timestamp
  completedAt?: Timestamp
  completedBy?: string
  notes?: string
  recurring?: {
    frequency: 'once' | 'daily' | 'bid' | 'tid' | 'qid' | 'q4h' | 'q6h' | 'q8h' | 'q12h'
    endDate?: Timestamp
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TaskFormData {
  patientId: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  assignedTo: string
  dueAt?: string
  recurring?: {
    frequency: 'once' | 'daily' | 'bid' | 'tid' | 'qid' | 'q4h' | 'q6h' | 'q8h' | 'q12h'
    endDate?: string
  }
  notes?: string
}
