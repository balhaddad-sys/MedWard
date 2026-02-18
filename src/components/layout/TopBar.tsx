import { Bell, Menu } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import { useNotificationStore } from '@/stores/notificationStore'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopBarProps {
  /** Override the displayed title. Falls back to the current mode label. */
  title?: string
  /** Optional callback for hamburger menu button. If omitted, the button is hidden. */
  onMenuToggle?: () => void
}

// ---------------------------------------------------------------------------
// TopBar component
// ---------------------------------------------------------------------------

export default function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { modeConfig } = useModeContext()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const displayTitle = title ?? modeConfig.label

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ward-border bg-white px-4">
      {/* Left: optional hamburger + title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="text-base font-semibold text-slate-900">
          {displayTitle}
        </h1>
      </div>

      {/* Right: notification bell */}
      <button
        type="button"
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
    </header>
  )
}
