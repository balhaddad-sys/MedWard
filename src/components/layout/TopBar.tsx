import { useState, useEffect } from 'react'
import { Bell, Menu, Clock, ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import type { ClinicalMode } from '@/config/modes'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopBarProps {
  title?: string
  onMenuToggle?: () => void
  onNotificationsToggle?: () => void
}

// ---------------------------------------------------------------------------
// Mode colour mapping
// ---------------------------------------------------------------------------

const MODE_COLORS: Record<ClinicalMode, string> = {
  ward: 'bg-blue-100 text-blue-700 border-blue-200',
  acute: 'bg-red-100 text-red-700 border-red-200',
  clerking: 'bg-amber-100 text-amber-700 border-amber-200',
}

const MODE_DOT: Record<ClinicalMode, string> = {
  ward: 'bg-blue-500',
  acute: 'bg-red-500 animate-pulse',
  clerking: 'bg-amber-500',
}

// ---------------------------------------------------------------------------
// Live clock hook
// ---------------------------------------------------------------------------

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ---------------------------------------------------------------------------
// Online status hook
// ---------------------------------------------------------------------------

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// ---------------------------------------------------------------------------
// TopBar component
// ---------------------------------------------------------------------------

export default function TopBar({ title, onMenuToggle, onNotificationsToggle }: TopBarProps) {
  const { mode, modeConfig } = useModeContext()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const user = useAuthStore((s) => s.user)
  const now = useLiveClock()
  const online = useOnlineStatus()

  const displayTitle = title ?? modeConfig.label

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : null

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ward-border bg-white px-4 gap-3">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate">
            {displayTitle}
          </h1>

          {/* Mode badge */}
          <span
            className={[
              'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0',
              MODE_COLORS[mode],
            ].join(' ')}
          >
            <span className={['h-1.5 w-1.5 rounded-full', MODE_DOT[mode]].join(' ')} />
            {modeConfig.label}
          </span>
        </div>
      </div>

      {/* Right: clock + user role + notifications */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Offline indicator */}
        {!online && (
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
            <WifiOff size={12} />
            Offline
          </span>
        )}

        {online && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Wifi size={12} className="text-emerald-500" />
          </span>
        )}

        {/* Live clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <Clock size={13} className="text-slate-400 shrink-0" />
          <div className="text-right">
            <div className="text-sm font-mono font-semibold text-slate-800 leading-none tabular-nums">
              {timeStr}
            </div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">
              {dateStr}
            </div>
          </div>
        </div>

        {/* Mobile clock (time only) */}
        <div className="flex md:hidden items-center gap-1 px-2 py-1 rounded-lg bg-slate-50">
          <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        {/* User role chip */}
        {roleLabel && (
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            title={user?.displayName}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-xs font-medium text-slate-600">{roleLabel}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
        )}

        {/* Notification bell */}
        <button
          type="button"
          onClick={onNotificationsToggle}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-clinical-critical px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
