import { NavLink, useNavigate } from 'react-router-dom'
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
  LogOut,
  Repeat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useModeContext } from '@/context/useModeContext'
import { useAuthStore } from '@/stores/authStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { signOut } from '@/services/firebase/auth'
import type { ClinicalMode } from '@/config/modes'

// ---------------------------------------------------------------------------
// Navigation item definition
// ---------------------------------------------------------------------------

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: 'patients' | 'tasks'
}

const NAV_ITEMS: Record<ClinicalMode, NavItem[]> = {
  ward: [
    { to: '/', label: 'Patients', icon: Users, badge: 'patients' },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList, badge: 'tasks' },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
    { to: '/drugs', label: 'Drug Info', icon: Pill },
  ],
  acute: [
    { to: '/', label: 'Patients', icon: Users, badge: 'patients' },
    { to: '/on-call', label: 'On-Call List', icon: Phone },
    { to: '/shift', label: 'Shift View', icon: Activity },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList, badge: 'tasks' },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/handover', label: 'Handover', icon: ArrowLeftRight },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
  ],
  clerking: [
    { to: '/', label: 'Patients', icon: Users, badge: 'patients' },
    { to: '/clerking', label: 'Clerking', icon: FileText },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList, badge: 'tasks' },
    { to: '/labs', label: 'Labs', icon: FlaskConical },
    { to: '/ai', label: 'AI Assistant', icon: Bot },
  ],
}

// ---------------------------------------------------------------------------
// Mode styling
// ---------------------------------------------------------------------------

const MODE_STYLES: Record<ClinicalMode, { dot: string; bg: string; text: string }> = {
  ward: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  acute: { dot: 'bg-red-500 animate-pulse', bg: 'bg-red-50', text: 'text-red-700' },
  clerking: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const { mode, modeConfig } = useModeContext()
  const user = useAuthStore((s) => s.user)
  const patients = usePatientStore((s) => s.patients)
  const tasks = useTaskStore((s) => s.tasks)
  const navigate = useNavigate()

  const navItems = NAV_ITEMS[mode]
  const modeStyle = MODE_STYLES[mode]

  const activeTaskCount = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  ).length
  const overdueTaskCount = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false
    if (!t.dueAt) return false
    const due = typeof t.dueAt === 'object' && 'toDate' in t.dueAt
      ? (t.dueAt as { toDate: () => Date }).toDate()
      : new Date(t.dueAt as unknown as string)
    return due < new Date()
  }).length

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch {
      // ignore
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-ward-border bg-white">
      {/* ---- Brand / logo ---- */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ward-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shrink-0">
          <Stethoscope size={20} />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            MedWard Pro
          </span>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5">Clinical Ward System</p>
        </div>
      </div>

      {/* ---- Mode indicator ---- */}
      <div className={['mx-4 mt-3 mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2', modeStyle.bg].join(' ')}>
        <span className={['inline-block h-2 w-2 rounded-full shrink-0', modeStyle.dot].join(' ')} />
        <div className="flex-1 min-w-0">
          <p className={['text-xs font-semibold', modeStyle.text].join(' ')}>
            {modeConfig.label} Mode
          </p>
          <p className="text-[10px] text-slate-400 truncate">{modeConfig.description}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/mode')}
          className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          title="Switch mode"
        >
          <Repeat size={12} className={modeStyle.text} />
        </button>
      </div>

      {/* ---- Patient summary strip ---- */}
      {patients.length > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <Users size={13} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{patients.length}</span> patient{patients.length !== 1 ? 's' : ''}
          </span>
          {overdueTaskCount > 0 && (
            <span className="ml-auto text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
              {overdueTaskCount} overdue
            </span>
          )}
        </div>
      )}

      {/* ---- Navigation links ---- */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
        {navItems.map(({ to, label, icon: Icon, badge }) => {
          const badgeCount = badge === 'patients'
            ? patients.length
            : badge === 'tasks'
            ? activeTaskCount
            : 0

          const isOverdueBadge = badge === 'tasks' && overdueTaskCount > 0

          return (
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
                    size={18}
                    className={
                      isActive
                        ? 'text-primary-600 shrink-0'
                        : 'text-slate-400 group-hover:text-slate-600 transition-colors duration-150 shrink-0'
                    }
                  />
                  <span className="flex-1">{label}</span>
                  {badgeCount > 0 && (
                    <span className={[
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      isOverdueBadge
                        ? 'bg-red-100 text-red-700'
                        : isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}>
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ---- Bottom section ---- */}
      <div className="border-t border-ward-border px-3 py-3 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={18}
                className={isActive ? 'text-primary-600 shrink-0' : 'text-slate-400 shrink-0 transition-colors duration-150'}
              />
              Settings
            </>
          )}
        </NavLink>

        {/* User info + sign out */}
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
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
              <p className="truncate text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
