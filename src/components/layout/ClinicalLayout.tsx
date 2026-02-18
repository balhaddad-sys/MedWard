import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useMobile } from '@/hooks/useMobile'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import TopBar from '@/components/layout/TopBar'
import NotificationDrawer from '@/components/layout/NotificationDrawer'
import { subscribeToNotifications } from '@/services/firebase/notifications'
import { showNotification } from '@/services/browserNotifications'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Notification } from '@/types/notification'

interface NotificationToggles {
  notifyCriticalLabs: boolean
  notifyTaskReminders: boolean
  notifyHandoverAlerts: boolean
}

function isNotificationEnabled(notification: Notification, toggles: NotificationToggles): boolean {
  switch (notification.type) {
    case 'critical_lab':
      return toggles.notifyCriticalLabs
    case 'task_assigned':
    case 'task_overdue':
      return toggles.notifyTaskReminders
    case 'escalation':
    case 'patient_deterioration':
      return toggles.notifyHandoverAlerts
    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// ClinicalLayout
// ---------------------------------------------------------------------------

/**
 * Main authenticated layout wrapper.
 *
 * - Desktop (>= 768px): Fixed sidebar on left + sticky top bar + scrollable main content.
 * - Mobile  (<  768px): Sticky top bar + scrollable main content + fixed bottom nav.
 *
 * Includes a slide-in NotificationDrawer accessible from the TopBar bell.
 */
export default function ClinicalLayout() {
  const isMobile = useMobile()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const userId = useAuthStore((s) => s.user?.id)
  const notifyCriticalLabs = useSettingsStore((s) => s.notifyCriticalLabs)
  const notifyTaskReminders = useSettingsStore((s) => s.notifyTaskReminders)
  const notifyHandoverAlerts = useSettingsStore((s) => s.notifyHandoverAlerts)
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const rawNotificationsRef = useRef<Notification[]>([])
  const seenNotificationIdsRef = useRef<Set<string>>(new Set())
  const hasPrimedSeenIdsRef = useRef(false)
  const notificationTogglesRef = useRef<NotificationToggles>({
    notifyCriticalLabs,
    notifyTaskReminders,
    notifyHandoverAlerts,
  })

  useEffect(() => {
    if (!userId) {
      rawNotificationsRef.current = []
      setNotifications([])
      seenNotificationIdsRef.current.clear()
      hasPrimedSeenIdsRef.current = false
      return
    }

    const unsubscribe = subscribeToNotifications(userId, (notifications) => {
      rawNotificationsRef.current = notifications
      const toggles = notificationTogglesRef.current
      const filteredNotifications = notifications.filter((notification) =>
        isNotificationEnabled(notification, toggles)
      )
      setNotifications(filteredNotifications)

      if (!hasPrimedSeenIdsRef.current) {
        seenNotificationIdsRef.current = new Set(notifications.map((notification) => notification.id))
        hasPrimedSeenIdsRef.current = true
        return
      }

      const incomingIds = new Set(notifications.map((notification) => notification.id))

      for (const notification of notifications) {
        if (seenNotificationIdsRef.current.has(notification.id)) continue
        seenNotificationIdsRef.current.add(notification.id)

        if (notification.readAt) continue
        if (!isNotificationEnabled(notification, toggles)) continue

        void showNotification({
          title: notification.title,
          body: notification.message,
          tag: notification.id,
          requireInteraction: notification.severity === 'critical',
        })
      }

      for (const notificationId of Array.from(seenNotificationIdsRef.current)) {
        if (!incomingIds.has(notificationId)) {
          seenNotificationIdsRef.current.delete(notificationId)
        }
      }
    })

    return () => {
      unsubscribe()
      rawNotificationsRef.current = []
      setNotifications([])
      seenNotificationIdsRef.current.clear()
      hasPrimedSeenIdsRef.current = false
    }
  }, [userId, setNotifications])

  useEffect(() => {
    const toggles: NotificationToggles = {
      notifyCriticalLabs,
      notifyTaskReminders,
      notifyHandoverAlerts,
    }
    notificationTogglesRef.current = toggles
    const filteredNotifications = rawNotificationsRef.current.filter((notification) =>
      isNotificationEnabled(notification, toggles)
    )
    setNotifications(filteredNotifications)
  }, [notifyCriticalLabs, notifyTaskReminders, notifyHandoverAlerts, setNotifications])

  // ---- Mobile layout ----
  if (isMobile) {
    return (
      <div className="flex min-h-dvh flex-col bg-ward-bg">
        <TopBar onNotificationsToggle={() => setNotificationsOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-20">
          <div className="mx-auto max-w-3xl">
            <Outlet />
          </div>
        </main>

        <MobileNav />

        <NotificationDrawer
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </div>
    )
  }

  // ---- Desktop layout ----
  return (
    <div className="flex min-h-dvh bg-ward-bg">
      <Sidebar />

      {/* Main content column (right of sidebar) */}
      <div className="ml-[260px] flex-1 flex flex-col min-h-dvh">
        {/* Desktop top bar (slim, clock + notifications) */}
        <TopBar onNotificationsToggle={() => setNotificationsOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  )
}
