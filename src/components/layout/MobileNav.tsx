import { NavLink } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  ArrowLeftRight,
  FlaskConical,
  Bot,
  Phone,
  Activity,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import type { ClinicalMode } from '@/config/modes'

// ---------------------------------------------------------------------------
// Mobile nav item definition (5 items per mode)
// ---------------------------------------------------------------------------

interface MobileNavItem {
  to: string
  label: string
  icon: LucideIcon
}

const MOBILE_NAV_ITEMS: Record<ClinicalMode, MobileNavItem[]> = {
  ward: [
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI', icon: Bot },
  ],
  acute: [
    { to: '/on-call', label: 'On-Call', icon: Phone },
    { to: '/shift', label: 'Shift', icon: Activity },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI', icon: Bot },
  ],
  clerking: [
    { to: '/clerking', label: 'Clerking', icon: FileText },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI', icon: Bot },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
  ],
}

// ---------------------------------------------------------------------------
// MobileNav component
// ---------------------------------------------------------------------------

export default function MobileNav() {
  const { mode } = useModeContext()
  const items = MOBILE_NAV_ITEMS[mode]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ward-border bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-1 py-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors duration-150',
                isActive
                  ? 'text-primary-600'
                  : 'text-slate-400 active:text-slate-600',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={
                    isActive ? 'text-primary-600' : 'text-slate-400'
                  }
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
