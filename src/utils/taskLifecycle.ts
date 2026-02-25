import type { Timestamp } from 'firebase/firestore'
import type { Task } from '@/types'

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000

type DateLike = Timestamp | Date | string | number | null | undefined

export const toJsDate = (value: DateLike): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate() as Date
  }
  return null
}

export const getTaskAutoDeleteDate = (
  task: Pick<Task, 'status' | 'completedAt' | 'autoDeleteAt'>
): Date | null => {
  if ((task.status ?? 'pending') !== 'completed') return null

  const explicitDeleteAt = toJsDate(task.autoDeleteAt)
  if (explicitDeleteAt) return explicitDeleteAt

  const completedAt = toJsDate(task.completedAt)
  if (!completedAt) return null

  return new Date(completedAt.getTime() + FIVE_HOURS_MS)
}

export const isTaskExpiredForDeletion = (
  task: Pick<Task, 'status' | 'completedAt' | 'autoDeleteAt'>,
  now = new Date()
): boolean => {
  const autoDeleteAt = getTaskAutoDeleteDate(task)
  if (!autoDeleteAt) return false
  return autoDeleteAt.getTime() <= now.getTime()
}

export const isTaskVisible = (
  task: Pick<Task, 'status' | 'completedAt' | 'autoDeleteAt'>,
  now = new Date()
): boolean => !isTaskExpiredForDeletion(task, now)
