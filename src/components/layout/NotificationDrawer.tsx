import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Bell,
  AlertTriangle,
  FlaskConical,
  ClipboardList,
  Activity,
  Info,
  ChevronRight,
  CheckCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationStore } from '@/stores/notificationStore'
import { markNotificationAsRead } from '@/services/firebase/notifications'
import type { Notification, NotificationType, NotificationSeverity } from '@/types/notification'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNotificationIcon(type: NotificationType, severity: NotificationSeverity) {
  switch (type) {
    case 'critical_lab':
      return <FlaskConical size={16} className="shrink-0" />
    case 'task_assigned':
    case 'task_overdue':
      return <ClipboardList size={16} className="shrink-0" />
    case 'escalation':
    case 'patient_deterioration':
      return <Activity size={16} className="shrink-0" />
    case 'info':
      return <Info size={16} className="shrink-0" />
    default:
      return <AlertTriangle size={16} className="shrink-0" />
  }
  void severity
}

function getSeverityStyles(severity: NotificationSeverity, isRead: boolean) {
  if (isRead) return 'bg-slate-50 border-slate-100'
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-100'
    case 'high':
      return 'bg-amber-50 border-amber-100'
    default:
      return 'bg-blue-50 border-blue-100'
  }
}

function getSeverityIconStyles(severity: NotificationSeverity, isRead: boolean) {
  if (isRead) return 'text-slate-400 bg-slate-100'
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-100'
    case 'high':
      return 'text-amber-600 bg-amber-100'
    default:
      return 'text-blue-600 bg-blue-100'
  }
}

function formatTimestamp(ts: unknown): string {
  try {
    const date = ts && typeof ts === 'object' && 'toDate' in ts
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as string)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// NotificationDrawer component
// ---------------------------------------------------------------------------

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate()
  const { notifications, markAsRead } = useNotificationStore()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid triggering on the open click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function handleNotificationClick(n: Notification) {
    if (!n.readAt) {
      markAsRead(n.id)
      void markNotificationAsRead(n.id).catch((error) => {
        console.error('Failed to mark notification as read:', error)
      })
    }

    if (n.actionUrl) {
      navigate(n.actionUrl)
      onClose()
    }
  }

  function handleMarkAllAsRead() {
    const unreadNotifications = notifications.filter((notification) => !notification.readAt)
    if (unreadNotifications.length === 0) return

    for (const notification of unreadNotifications) {
      markAsRead(notification.id)
    }

    void Promise.allSettled(
      unreadNotifications.map((notification) => markNotificationAsRead(notification.id))
    )
  }

  const unread = notifications.filter((n) => !n.readAt)
  const read = notifications.filter((n) => n.readAt)

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
        className={[
          'fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
            {unread.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                {unread.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="p-4 rounded-full bg-slate-100">
                <Bell size={24} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">All caught up</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  No notifications at this time
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Unread */}
              {unread.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      New ({unread.length})
                    </p>
                  </div>
                  {unread.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onClick={() => handleNotificationClick(n)}
                    />
                  ))}
                </div>
              )}

              {/* Read */}
              {read.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Earlier
                    </p>
                  </div>
                  {read.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onClick={() => handleNotificationClick(n)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Notifications are synced with your account
          </p>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// NotificationItem sub-component
// ---------------------------------------------------------------------------

function NotificationItem({
  notification: n,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const isRead = !!n.readAt

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-start gap-3 px-4 py-3 text-left',
        'border-b border-slate-100 transition-colors',
        isRead
          ? 'hover:bg-slate-50'
          : 'hover:bg-white',
        getSeverityStyles(n.severity, isRead),
      ].join(' ')}
    >
      {/* Icon */}
      <div className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
        getSeverityIconStyles(n.severity, isRead),
      ].join(' ')}>
        {getNotificationIcon(n.type, n.severity)}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={[
          'text-sm font-medium leading-tight',
          isRead ? 'text-slate-500' : 'text-slate-900',
        ].join(' ')}>
          {n.title}
        </p>
        <p className={[
          'text-xs mt-0.5 leading-snug',
          isRead ? 'text-slate-500' : 'text-slate-600',
        ].join(' ')}>
          {n.message}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          {formatTimestamp(n.createdAt)}
        </p>
      </div>

      {/* Chevron if has action */}
      {n.actionUrl && (
        <ChevronRight size={14} className="text-slate-400 shrink-0 mt-1" />
      )}

      {/* Unread dot */}
      {!isRead && (
        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </button>
  )
}
