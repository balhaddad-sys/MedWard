import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  ArrowLeftRight,
  FlaskConical,
  Bot,
  Phone,
  Activity,
  FileText,
  MoreHorizontal,
  Pill,
  Settings,
  X,
  Repeat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import { useTaskStore } from '@/stores/taskStore'
import type { ClinicalMode } from '@/config/modes'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Mobile nav item definition
// ---------------------------------------------------------------------------

interface MobileNavItem {
  to: string
  label: string
  icon: LucideIcon
}

const MOBILE_NAV_ITEMS: Record<ClinicalMode, MobileNavItem[]> = {
  ward: [
    { to: '/', label: 'Patients', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
  ],
  acute: [
    { to: '/on-call', label: 'On-Call', icon: Phone },
    { to: '/shift', label: 'Shift', icon: Activity },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
  ],
  clerking: [
    { to: '/clerking', label: 'Clerking', icon: FileText },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/', label: 'Patients', icon: Users },
  ],
}

const MORE_NAV_ITEMS: Record<ClinicalMode, MobileNavItem[]> = {
  ward: [
    { to: '/ai', label: 'AI Assistant', icon: Bot },
    { to: '/drugs', label: 'Drug Info', icon: Pill },
    { to: '/on-call', label: 'On-Call', icon: Phone },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/mode', label: 'Change Mode', icon: Repeat },
  ],
  acute: [
    { to: '/', label: 'Patients', icon: Users },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
    { to: '/drugs', label: 'Drug Info', icon: Pill },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/mode', label: 'Change Mode', icon: Repeat },
  ],
  clerking: [
    { to: '/ai', label: 'AI Assistant', icon: Bot },
    { to: '/drugs', label: 'Drug Info', icon: Pill },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/mode', label: 'Change Mode', icon: Repeat },
  ],
}

// ---------------------------------------------------------------------------
// MobileNav component
// ---------------------------------------------------------------------------

export default function MobileNav() {
  const { mode } = useModeContext()
  const items = MOBILE_NAV_ITEMS[mode]
  const moreItems = MORE_NAV_ITEMS[mode]
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasks)

  const isMoreActive = moreItems.some((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  )

  // Count overdue tasks for badge
  const overdueTaskCount = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false
    if (!t.dueAt) return false
    const due = typeof t.dueAt === 'object' && 'toDate' in t.dueAt
      ? (t.dueAt as { toDate: () => Date }).toDate()
      : new Date(t.dueAt as unknown as string)
    return due < new Date()
  }).length

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-[60px] left-0 right-0 rounded-t-2xl bg-ward-card p-4 pb-[env(safe-area-inset-bottom)] border-t border-ward-border animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">More</span>
              <button
                onClick={() => setShowMore(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map(({ to, label, icon: Icon }) => {
                const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
                return (
                  <button
                    key={to}
                    onClick={() => {
                      navigate(to)
                      setShowMore(false)
                    }}
                    className={[
                      'flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800',
                    ].join(' ')}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="text-[10px] font-medium leading-tight text-center">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ward-border bg-ward-card pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-all duration-150',
                  isActive
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                    {/* Overdue task badge */}
                    {to === '/tasks' && overdueTaskCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
                        {overdueTaskCount > 9 ? '9+' : overdueTaskCount}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={[
              'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-all duration-150',
              isMoreActive || showMore
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
            ].join(' ')}
          >
            <MoreHorizontal
              size={22}
              strokeWidth={isMoreActive || showMore ? 2.25 : 1.75}
            />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
