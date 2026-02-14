import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { getOverdueTasks } from '@/services/firebase/tasks'
import { showNotification, getNotificationPermission } from '@/services/browserNotifications'

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes
const NOTIFICATION_CACHE_KEY = 'missedTaskNotifications'

interface NotificationRecord {
  taskId: string
  notifiedAt: number
}

/**
 * Get previously notified task IDs from localStorage
 */
const getNotifiedTaskIds = (): Set<string> => {
  try {
    const cached = localStorage.getItem(NOTIFICATION_CACHE_KEY)
    if (!cached) return new Set()
    const records: NotificationRecord[] = JSON.parse(cached)
    return new Set(records.map((r) => r.taskId))
  } catch {
    return new Set()
  }
}

/**
 * Save notified task ID to localStorage
 */
const markTaskNotified = (taskId: string): void => {
  try {
    const cached = localStorage.getItem(NOTIFICATION_CACHE_KEY)
    const records: NotificationRecord[] = cached ? JSON.parse(cached) : []
    records.push({ taskId, notifiedAt: Date.now() })

    // Keep only last 100 records to prevent unbounded growth
    const trimmed = records.slice(-100)
    localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.warn('Failed to cache notification:', error)
  }
}

/**
 * Hook to manage missed task notifications
 * Checks for overdue/unacknowledged tasks and sends browser notifications + toasts
 */
export const useMissedTaskNotifications = () => {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addToast = useUIStore((s) => s.addToast)
  const notifiedTasksRef = useRef<Set<string>>(getNotifiedTaskIds())

  useEffect(() => {
    if (!firebaseUser) return

    const checkMissedTasks = async () => {
      try {
        const overdueTasks = await getOverdueTasks(firebaseUser.uid)

        if (overdueTasks.length === 0) return

        // Filter to only tasks we haven't notified about yet
        const newMissedTasks = overdueTasks.filter(
          (task) => !notifiedTasksRef.current.has(task.id)
        )

        if (newMissedTasks.length === 0) return

        // Group tasks by type for notification
        const criticalUnacknowledged = newMissedTasks.filter(
          (t) => (t.priority === 'critical' || t.priority === 'high') && !t.acknowledgedAt
        )
        const overdue = newMissedTasks.filter((t) => {
          if (!t.dueAt) return false
          const dueDate =
            typeof t.dueAt === 'object' && 'toDate' in t.dueAt
              ? t.dueAt.toDate()
              : new Date(t.dueAt)
          return dueDate < new Date()
        })

        // Send notifications
        const hasPermission = getNotificationPermission() === 'granted'

        // Critical unacknowledged tasks
        if (criticalUnacknowledged.length > 0) {
          const task = criticalUnacknowledged[0]
          const count = criticalUnacknowledged.length

          // Browser notification
          if (hasPermission) {
            await showNotification({
              title: `${count} Urgent Task${count > 1 ? 's' : ''} Need Acknowledgment`,
              body: count === 1
                ? `${task.title} - ${task.patientName} (Bed ${task.bedNumber})`
                : `Including: ${task.title} and ${count - 1} more`,
              tag: 'critical-tasks',
              requireInteraction: true,
            })
          }

          // In-app toast
          addToast({
            type: 'error',
            title: `${count} Urgent Task${count > 1 ? 's' : ''} Require Acknowledgment`,
            message: count === 1
              ? `${task.title} - ${task.patientName}`
              : `Including: ${task.title} and ${count - 1} more`,
          })

          // Mark as notified
          criticalUnacknowledged.forEach((t) => {
            notifiedTasksRef.current.add(t.id)
            markTaskNotified(t.id)
          })
        }

        // Overdue tasks
        if (overdue.length > 0) {
          const task = overdue[0]
          const count = overdue.length

          // Browser notification
          if (hasPermission) {
            await showNotification({
              title: `${count} Overdue Task${count > 1 ? 's' : ''}`,
              body: count === 1
                ? `${task.title} - ${task.patientName} (Bed ${task.bedNumber})`
                : `Including: ${task.title} and ${count - 1} more`,
              tag: 'overdue-tasks',
              requireInteraction: false,
            })
          }

          // In-app toast
          addToast({
            type: 'warning',
            title: `${count} Task${count > 1 ? 's' : ''} Overdue`,
            message: count === 1
              ? `${task.title} - ${task.patientName}`
              : `Including: ${task.title} and ${count - 1} more`,
          })

          // Mark as notified
          overdue.forEach((t) => {
            notifiedTasksRef.current.add(t.id)
            markTaskNotified(t.id)
          })
        }
      } catch (error) {
        console.error('Failed to check missed tasks:', error)
      }
    }

    // Run immediately on mount
    void checkMissedTasks()

    // Then run every 5 minutes
    const intervalId = window.setInterval(() => {
      void checkMissedTasks()
    }, CHECK_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [firebaseUser, addToast])
}
