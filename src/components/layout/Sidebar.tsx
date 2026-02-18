import { NavLink } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  ArrowLeftRight,
  FlaskConical,
  Bot,
  Pill,
  Phone,
  Activity,
  FileText,
  Settings,
  Stethoscope,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import { useAuthStore } from '@/stores/authStore'
import type { ClinicalMode } from '@/config/modes'

// ---------------------------------------------------------------------------
// Navigation item definition
// ---------------------------------------------------------------------------

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: Record<ClinicalMode, NavItem[]> = {
  ward: [
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
    { to: '/drugs', label: 'Drug Info', icon: Pill },
  ],
  acute: [
    { to: '/on-call', label: 'On-Call List', icon: Phone },
    { to: '/shift', label: 'Shift View', icon: Activity },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
  ],
  clerking: [
    { to: '/clerking', label: 'Clerking', icon: FileText },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
  ],
}

// ---------------------------------------------------------------------------
// Mode dot colour mapping
// ---------------------------------------------------------------------------

const MODE_DOT_COLOR: Record<ClinicalMode, string> = {
  ward: 'bg-primary-500',
  acute: 'bg-clinical-critical',
  clerking: 'bg-amber-500',
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const { mode, modeConfig } = useModeContext()
  const user = useAuthStore((s) => s.user)
  const navItems = NAV_ITEMS[mode]

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-ward-border bg-white">
      {/* ---- Brand / logo ---- */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Stethoscope size={20} />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">
          MedWard Pro
        </span>
      </div>

      {/* ---- Mode indicator ---- */}
      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${MODE_DOT_COLOR[mode]}`}
        />
        <span className="text-sm font-medium text-slate-700">
          {modeConfig.label}
        </span>
        <span className="ml-auto text-xs text-slate-400">mode</span>
      </div>

      {/* ---- Navigation links ---- */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  className={
                    isActive
                      ? 'text-primary-600'
                      : 'text-slate-400 group-hover:text-slate-600 transition-colors duration-150'
                  }
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ---- Bottom section ---- */}
      <div className="border-t border-ward-border px-3 py-3 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={20}
                className={
                  isActive
                    ? 'text-primary-600'
                    : 'text-slate-400 transition-colors duration-150'
                }
              />
              Settings
            </>
          )}
        </NavLink>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user.displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-slate-400">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
