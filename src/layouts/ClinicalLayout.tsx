import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useClinicalMode } from '../context/useClinicalMode'
import { triggerHaptic } from '../utils/haptics'
import { SyncBadge } from '../components/SyncBadge'
import { clsx } from 'clsx'
import {
  Users,
  CheckSquare,
  FlaskConical,
  ArrowRightLeft,
  Phone,
  Stethoscope,
  MoreHorizontal,
  X,
  LogOut,
  Settings,
  Workflow,
  ChevronDown,
  Activity,
  Pill,
  Bot,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useTaskStore } from '@/stores/taskStore'
import { usePatientStore } from '@/stores/patientStore'
import { signOut } from '@/services/firebase/auth'
import { APP_NAME } from '@/config/constants'
import { useState, useMemo, useRef } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import type { ClinicalMode } from '@/config/modes'

// ─── Nav items ───────────────────────────────────────────────────────────────

function useNavItems(mode: ClinicalMode) {
  const tasks = useTaskStore((s) => s.tasks)
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)

  const pendingTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'cancelled'
  ).length
  const criticalLabs = criticalValues.filter((cv) => !cv.acknowledgedAt).length

  const wardPrimary = useMemo(() => [
    { path: '/patients',  icon: Users,         label: 'Patients',  badge: patients.length, badgeAlert: false },
    { path: '/tasks',     icon: CheckSquare,   label: 'Tasks',     badge: pendingTasks,    badgeAlert: pendingTasks > 0 },
    { path: '/labs',      icon: FlaskConical,  label: 'Labs',      badge: criticalLabs,    badgeAlert: criticalLabs > 0 },
    { path: '/handover',  icon: ArrowRightLeft,label: 'Handover',  badge: 0,               badgeAlert: false },
  ], [patients.length, pendingTasks, criticalLabs])

  const acutePrimary = useMemo(() => [
    { path: '/on-call',   icon: Phone,         label: 'On-Call',   badge: 0,               badgeAlert: false },
    { path: '/tasks',     icon: CheckSquare,   label: 'Tasks',     badge: pendingTasks,    badgeAlert: pendingTasks > 0 },
    { path: '/labs',      icon: FlaskConical,  label: 'Labs',      badge: criticalLabs,    badgeAlert: criticalLabs > 0 },
    { path: '/handover',  icon: ArrowRightLeft,label: 'Handover',  badge: 0,               badgeAlert: false },
  ], [pendingTasks, criticalLabs])

  const clerkingPrimary = useMemo(() => [
    { path: '/clerking',  icon: Stethoscope,   label: 'Clerking',  badge: 0,               badgeAlert: false },
    { path: '/patients',  icon: Users,         label: 'Patients',  badge: patients.length, badgeAlert: false },
    { path: '/tasks',     icon: CheckSquare,   label: 'Tasks',     badge: pendingTasks,    badgeAlert: pendingTasks > 0 },
    { path: '/handover',  icon: ArrowRightLeft,label: 'Handover',  badge: 0,               badgeAlert: false },
  ], [patients.length, pendingTasks])

  const wardMore = [
    { path: '/on-call',  icon: Phone,        label: 'On-Call' },
    { path: '/ai',       icon: Bot,          label: 'AI Assist' },
    { path: '/drugs',    icon: Pill,         label: 'Drug Info' },
    { path: '/settings', icon: Settings,     label: 'Settings' },
  ]

  const acuteMore = [
    { path: '/patients', icon: Users,        label: 'Patients' },
    { path: '/ai',       icon: Bot,          label: 'AI Assist' },
    { path: '/drugs',    icon: Pill,         label: 'Drug Info' },
    { path: '/settings', icon: Settings,     label: 'Settings' },
  ]

  const clerkingMore = [
    { path: '/on-call',  icon: Phone,        label: 'On-Call' },
    { path: '/labs',     icon: FlaskConical, label: 'Labs' },
    { path: '/ai',       icon: Bot,          label: 'AI Assist' },
    { path: '/settings', icon: Settings,     label: 'Settings' },
  ]

  const primary = mode === 'acute' ? acutePrimary : mode === 'clerking' ? clerkingPrimary : wardPrimary
  const more    = mode === 'acute' ? acuteMore    : mode === 'clerking' ? clerkingMore    : wardMore

  return { primary, more }
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function Sidebar({ mode }: { mode: ClinicalMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { config, setMode } = useClinicalMode()
  const { primary, more } = useNavItems(mode)
  const isDark = mode === 'acute'

  const allNav = [...primary, ...more]
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleSignOut = async () => { await signOut() }

  return (
    <aside
      className={clsx(
        'w-[220px] min-h-0 flex flex-col border-r flex-shrink-0 transition-colors duration-300 overflow-hidden',
        isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-ward-border'
      )}
    >
      {/* Mode indicator */}
      <div className={clsx('px-3 py-3 border-b', isDark ? 'border-gray-800' : 'border-gray-100')}>
        <div className={clsx(
          'flex items-center justify-between rounded-xl px-3 py-2.5',
          isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={clsx(
              'h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0',
              mode === 'ward' ? 'bg-blue-600' : mode === 'acute' ? 'bg-amber-500' : 'bg-stone-600'
            )}>
              {mode === 'ward'
                ? <Users className="h-3.5 w-3.5 text-white" />
                : mode === 'acute'
                ? <Activity className="h-3.5 w-3.5 text-white" />
                : <Stethoscope className="h-3.5 w-3.5 text-white" />}
            </div>
            <p className={clsx('text-xs font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>
              {config.label}
            </p>
          </div>
          <button
            onClick={() => { triggerHaptic('tap'); navigate('/mode') }}
            className={clsx(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-lg border transition-colors flex-shrink-0 ml-1',
              isDark
                ? 'border-slate-700 text-slate-400 hover:text-slate-200'
                : 'border-gray-200 text-gray-500 hover:text-gray-700'
            )}
          >
            Switch
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-0.5">
        {allNav.map((item) => {
          const active = isActive(item.path)
          const hasBadge = 'badge' in item && (item as { badge: number }).badge > 0
          const isAlert = 'badgeAlert' in item && (item as { badgeAlert: boolean }).badgeAlert

          return (
            <button
              key={item.path}
              onClick={() => { triggerHaptic('tap'); navigate(item.path) }}
              className={clsx(
                'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-100',
                active && !isDark && 'bg-blue-50 text-blue-700',
                active && isDark && 'bg-amber-500/15 text-amber-400',
                !active && !isDark && 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                !active && isDark && 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {hasBadge && (
                <span className={clsx(
                  'min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 tabular-nums flex-shrink-0',
                  isAlert ? 'bg-red-100 text-red-700'
                    : isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
                )}>
                  {Math.min((item as { badge: number }).badge, 99)}{(item as { badge: number }).badge > 99 ? '+' : ''}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer: mode switcher + user */}
      <div className={clsx('border-t px-3 py-3 space-y-2.5', isDark ? 'border-gray-800' : 'border-gray-100')}>
        {/* Compact mode switcher */}
        <div className={clsx('flex items-center gap-0.5 p-0.5 rounded-xl', isDark ? 'bg-slate-800' : 'bg-gray-100')}>
          {(['ward', 'acute', 'clerking'] as ClinicalMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { triggerHaptic('tap'); setMode(m) }}
              className={clsx(
                'flex-1 py-1 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-150',
                mode === m && m === 'ward'     && 'bg-blue-600 text-white shadow-sm',
                mode === m && m === 'acute'    && 'bg-amber-500 text-white shadow-sm',
                mode === m && m === 'clerking' && 'bg-stone-600 text-white shadow-sm',
                mode !== m && isDark           && 'text-slate-600 hover:text-slate-400',
                mode !== m && !isDark          && 'text-gray-400 hover:text-gray-600'
              )}
            >
              {m === 'ward' ? 'Ward' : m === 'acute' ? 'Call' : 'Clerk'}
            </button>
          ))}
        </div>

        {/* User row */}
        <div className="flex items-center gap-2">
          <div className={clsx('h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0', isDark ? 'bg-slate-700' : 'bg-blue-100')}>
            <span className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-blue-700')}>
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-slate-300' : 'text-gray-800')}>
              {user?.displayName ?? 'Doctor'}
            </p>
            <p className={clsx('text-[10px] truncate capitalize', isDark ? 'text-slate-500' : 'text-gray-400')}>
              {user?.role ?? 'Physician'}
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => navigate('/settings')}
              className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleSignOut}
              className={clsx('p-1.5 rounded-lg transition-colors', isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50')}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function BottomNav({ mode }: { mode: ClinicalMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { primary, more } = useNavItems(mode)
  const [showMore, setShowMore] = useState(false)
  const isDark = mode === 'acute'

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const isMoreActive = more.some((item) => isActive(item.path))

  return (
    <>
      {/* More sheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        >
          <div
            className={clsx(
              'absolute bottom-[64px] left-0 right-0 rounded-t-2xl p-4 safe-bottom animate-slide-up border-t',
              isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-ward-border'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-ward-text')}>
                More Tools
              </span>
              <button
                onClick={() => setShowMore(false)}
                className={clsx('p-1.5 rounded-xl', isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-ward-muted')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {more.map((item) => {
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setShowMore(false) }}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 rounded-xl transition-colors',
                      active
                        ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold leading-tight text-center">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-30 border-t safe-bottom transition-colors duration-300',
          isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around px-1 py-0.5">
          {primary.map((item) => {
            const active = isActive(item.path)
            const hasBadge = item.badge > 0

            return (
              <button
                key={item.path}
                onClick={() => { triggerHaptic('tap'); navigate(item.path) }}
                className={clsx(
                  'relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-100 min-h-[52px] min-w-[52px]',
                  active
                    ? isDark ? 'text-amber-400' : 'text-blue-600'
                    : isDark ? 'text-gray-600' : 'text-gray-400'
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {hasBadge && (
                    <span className={clsx(
                      'absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1',
                      item.badgeAlert ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                    )}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                {active && (
                  <span className={clsx(
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full',
                    isDark ? 'bg-amber-400' : 'bg-blue-600'
                  )} />
                )}
              </button>
            )
          })}

          {more.length > 0 && (
            <button
              onClick={() => { triggerHaptic('tap'); setShowMore(!showMore) }}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-100 min-h-[52px] min-w-[52px]',
                (isMoreActive || showMore)
                  ? isDark ? 'text-amber-400' : 'text-blue-600'
                  : isDark ? 'text-gray-600' : 'text-gray-400'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold leading-none">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

// ─── Top Header ────────────────────────────────────────────────────────────────

function TopHeader({ mode }: { mode: ClinicalMode }) {
  const navigate = useNavigate()
  const isMobile = useUIStore((s) => s.isMobile)
  const user = useAuthStore((s) => s.user)
  const { setMode, isTransitioning } = useClinicalMode()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isDark = mode === 'acute'

  useClickOutside(dropdownRef, () => setShowUserMenu(false), showUserMenu)

  const handleSignOut = async () => { await signOut() }

  return (
    <header className={clsx(
      'h-14 flex items-center justify-between px-3 sm:px-4 border-b flex-shrink-0 transition-colors duration-300 z-30',
      isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
      isTransitioning && 'opacity-80'
    )}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className={clsx(
          'flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors',
          isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
        )}
      >
        <div className={clsx(
          'h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
          mode === 'acute' ? 'bg-amber-500' : 'bg-blue-600'
        )}>
          <span className="text-white font-black text-sm">M</span>
        </div>
        {!isMobile && (
          <span className={clsx('font-bold text-sm tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
            {APP_NAME}
            <span className={clsx('font-normal ml-1', isDark ? 'text-slate-500' : 'text-gray-400')}>Pro</span>
          </span>
        )}
      </button>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Mobile mode switcher */}
        {isMobile && (
          <div className={clsx('flex items-center gap-0.5 p-0.5 rounded-xl', isDark ? 'bg-slate-800' : 'bg-gray-100')}>
            {(['ward', 'acute', 'clerking'] as ClinicalMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { triggerHaptic('tap'); setMode(m) }}
                className={clsx(
                  'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150',
                  mode === m && m === 'ward'     && 'bg-blue-600 text-white shadow-sm',
                  mode === m && m === 'acute'    && 'bg-amber-500 text-white shadow-sm',
                  mode === m && m === 'clerking' && 'bg-stone-600 text-white shadow-sm',
                  mode !== m && isDark           && 'text-slate-600',
                  mode !== m && !isDark          && 'text-gray-400'
                )}
              >
                {m === 'ward' ? 'Ward' : m === 'acute' ? 'Call' : 'Clerk'}
              </button>
            ))}
          </div>
        )}

        <SyncBadge />

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={clsx(
              'flex items-center gap-2 p-1.5 rounded-xl transition-colors min-h-[44px]',
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
          >
            <div className={clsx('h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0', isDark ? 'bg-slate-700' : 'bg-blue-100')}>
              <span className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-blue-700')}>
                {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            {!isMobile && (
              <>
                <span className={clsx('text-sm font-medium', isDark ? 'text-slate-300' : 'text-gray-700')}>
                  {user?.displayName ?? 'Doctor'}
                </span>
                <ChevronDown className={clsx('h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
              </>
            )}
          </button>

          {showUserMenu && isMobile && (
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          )}

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 animate-fade-in z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role ?? 'Physician'}</p>
              </div>
              <button
                onClick={() => { navigate('/mode'); setShowUserMenu(false) }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
              >
                <Workflow className="h-4 w-4 text-gray-400" />
                Change Mode
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowUserMenu(false) }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Root layout ────────────────────────────────────────────────────────────

export default function ClinicalLayout() {
  const { mode, isTransitioning } = useClinicalMode()
  const isMobile = useUIStore((s) => s.isMobile)
  const location = useLocation()
  const isDark = mode === 'acute'

  return (
    <div className={clsx(
      'h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300',
      isDark ? 'bg-gray-950' : 'bg-ward-bg'
    )}>
      <TopHeader mode={mode} />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {!isMobile && <Sidebar mode={mode} />}

        <main className={clsx(
          'flex-1 overflow-y-auto scrollbar-thin relative transition-all duration-150 min-w-0',
          isDark ? 'bg-gray-950' : 'bg-ward-bg',
          isTransitioning && 'opacity-50 blur-sm pointer-events-none'
        )}>
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>

      {isMobile && <BottomNav key={location.pathname} mode={mode} />}
    </div>
  )
}
