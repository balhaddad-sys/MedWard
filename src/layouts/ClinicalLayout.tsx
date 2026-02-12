import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useClinicalMode } from '../context/useClinicalMode'
import type { ClinicalMode } from '../config/modes'
import { triggerHaptic } from '../utils/haptics'
import { SyncBadge } from '../components/SyncBadge'
import { Sidebar } from '../components/layout/Sidebar'
import { clsx } from 'clsx'
import {
  ClipboardList,
  Siren,
  Stethoscope,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  FlaskConical,
  Bot,
  Settings,
  MoreHorizontal,
  X,
  ArrowRightLeft,
  Pill,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { signOut } from '@/services/firebase/auth'
import { APP_NAME } from '@/config/constants'
import { useState, useMemo, useRef } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

export default function ClinicalLayout() {
  const { mode, isTransitioning } = useClinicalMode()
  const user = useAuthStore((s) => s.user)
  const isMobile = useUIStore((s) => s.isMobile)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, () => setShowUserMenu(false), showUserMenu)

  const notificationCount = useMemo(() => {
    const unackedCriticals = criticalValues.filter((cv) => !cv.acknowledgedAt).length
    const criticalTasks = tasks.filter(
      (t) => t.priority === 'critical' && t.status !== 'completed' && t.status !== 'cancelled'
    ).length
    return unackedCriticals + criticalTasks
  }, [criticalValues, tasks])

  const primaryMobileNav = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/ai', icon: Bot, label: 'AI' },
    { path: '/labs', icon: FlaskConical, label: 'Labs' },
  ]

  const moreNav = [
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/drugs', icon: Pill, label: 'Drug Info' },
    { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isMoreActive = moreNav.some((item) => location.pathname === item.path)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header
        className={clsx(
          'h-14 flex items-center justify-between px-3 sm:px-4 border-b shrink-0 transition-colors duration-300 z-30',
          mode === 'ward' && 'bg-white border-neutral-200',
          mode === 'acute' && 'bg-gray-900 border-gray-700 text-white',
          mode === 'clerking' && 'bg-stone-50 border-stone-200'
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer touch" onClick={() => navigate('/')}>
            <div
              className={clsx(
                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                mode === 'acute' ? 'bg-amber-500' : 'bg-primary-600'
              )}
            >
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span
              className={clsx(
                'font-bold tracking-tight text-sm hidden sm:block',
                mode === 'acute' ? 'text-white' : 'text-ward-text'
              )}
            >
              {APP_NAME} <span className="opacity-50">PRO</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Indicator Pill (mobile only) */}
          {isMobile && (
            <div
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                mode === 'ward' && 'bg-blue-100 text-blue-700',
                mode === 'acute' && 'bg-amber-500 text-white',
                mode === 'clerking' && 'bg-stone-200 text-stone-700'
              )}
            >
              {mode === 'ward' ? 'Ward' : mode === 'acute' ? 'On-Call' : 'Clerking'}
            </div>
          )}

          <SyncBadge />

          {/* Notifications */}
          <button
            className={clsx(
              'relative p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch',
              mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
          >
            <Bell
              className={clsx(
                'h-5 w-5',
                notificationCount > 0
                  ? 'text-red-500'
                  : mode === 'acute' ? 'text-slate-400' : 'text-ward-muted'
              )}
            />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={clsx(
                'flex items-center gap-2 p-1.5 rounded-lg transition-colors min-h-[44px] touch',
                mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              )}
            >
              <div
                className={clsx(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  mode === 'acute' ? 'bg-slate-600/60' : 'bg-primary-100'
                )}
              >
                <User
                  className={clsx(
                    'h-4 w-4',
                    mode === 'acute' ? 'text-slate-300' : 'text-primary-700'
                  )}
                />
              </div>
              {!isMobile && (
                <span className={clsx(
                  'text-sm font-medium',
                  mode === 'acute' ? 'text-slate-300' : 'text-ward-text'
                )}>
                  {user?.displayName || 'User'}
                </span>
              )}
            </button>

            {/* Mobile backdrop - tap to close dropdown */}
            {showUserMenu && isMobile && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
            )}

            {showUserMenu && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in z-50"
              >
                <div className="px-4 py-2 border-b border-ward-border">
                  <p className="text-sm font-medium text-ward-text">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-ward-muted">{user?.role}</p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ward-text hover:bg-gray-50 min-h-[44px]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main Content Area */}
        <main
          className={clsx(
            'flex-1 overflow-y-auto relative transition-opacity duration-150 min-w-0',
            isTransitioning ? 'opacity-50 blur-sm' : 'opacity-100',
            'bg-ward-bg'
          )}
        >
          <div className="p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile only) */}
      {isMobile && (
        <>
          {showMore && (
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowMore(false)}
            >
              <div
                className={clsx(
                  'absolute bottom-[64px] left-0 right-0 rounded-t-2xl p-4 safe-bottom animate-slide-up border-t',
                  mode === 'acute'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-ward-border'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      mode === 'acute' ? 'text-white' : 'text-ward-text'
                    )}
                  >
                    More
                  </span>
                  <button
                    onClick={() => setShowMore(false)}
                    className={clsx(
                      'p-1 rounded-lg touch',
                      mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    )}
                  >
                    <X
                      className={clsx(
                        'h-4 w-4',
                        mode === 'acute' ? 'text-slate-400' : 'text-ward-muted'
                      )}
                    />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {moreNav.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setShowMore(false)
                        }}
                        className={clsx(
                          'flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-colors touch',
                          isActive
                            ? mode === 'acute'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-primary-50 text-primary-600'
                            : mode === 'acute'
                              ? 'text-gray-400 hover:bg-white/5'
                              : 'text-ward-muted hover:bg-gray-50'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium leading-tight">
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <nav
            className={clsx(
              'fixed bottom-0 left-0 right-0 z-30 border-t safe-bottom transition-colors duration-300',
              mode === 'acute'
                ? 'bg-gray-900 border-gray-700'
                : 'bg-white border-neutral-200'
            )}
          >
            <div className="flex items-center justify-around py-1">
              {primaryMobileNav.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      triggerHaptic('tap')
                      navigate(item.path)
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-h-[48px] min-w-[48px] touch',
                      isActive
                        ? mode === 'acute'
                          ? 'text-amber-400'
                          : 'text-primary-600'
                        : mode === 'acute'
                          ? 'text-gray-500'
                          : 'text-ward-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">
                      {item.label}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={() => setShowMore(!showMore)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-h-[48px] min-w-[48px] touch',
                  isMoreActive || showMore
                    ? mode === 'acute'
                      ? 'text-amber-400'
                      : 'text-primary-600'
                    : mode === 'acute'
                      ? 'text-gray-500'
                      : 'text-ward-muted'
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">More</span>
              </button>
            </div>

            {/* Mode Switcher Bar */}
            <div
              className={clsx(
                'flex items-center justify-around border-t px-2 py-1',
                mode === 'acute' ? 'border-gray-700' : 'border-neutral-100'
              )}
            >
              <ModeNavButton id="ward" label="Ward" Icon={ClipboardList} />
              <ModeNavButton id="acute" label="On-Call" Icon={Siren} />
              <ModeNavButton id="clerking" label="Clerking" Icon={Stethoscope} />
            </div>
          </nav>
        </>
      )}
    </div>
  )
}

function ModeNavButton({
  id,
  label,
  Icon,
}: {
  id: ClinicalMode
  label: string
  Icon: React.ElementType
}) {
  const { mode, setMode } = useClinicalMode()
  const isActive = mode === id

  return (
    <button
      onClick={() => {
        triggerHaptic('tap')
        setMode(id)
      }}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 touch text-xs font-medium',
        isActive && id === 'ward' && 'text-blue-600 bg-blue-50',
        isActive && id === 'acute' && 'text-amber-500 bg-amber-500/10',
        isActive && id === 'clerking' && 'text-stone-700 bg-stone-100',
        !isActive &&
          (mode === 'acute' ? 'text-gray-500 hover:text-gray-300' : 'text-neutral-400 hover:text-neutral-600')
      )}
      aria-label={`Switch to ${label} mode`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}
