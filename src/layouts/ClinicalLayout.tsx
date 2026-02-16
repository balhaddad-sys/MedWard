import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useClinicalMode } from '../context/useClinicalMode'
import { triggerHaptic } from '../utils/haptics'
import { SyncBadge } from '../components/SyncBadge'
import { Sidebar } from '../components/layout/Sidebar'
import { clsx } from 'clsx'
import {
  User,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  FlaskConical,
  Settings,
  MoreHorizontal,
  X,
  ArrowRightLeft,
  Users,
  Phone,
  Stethoscope,
  Workflow,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { signOut } from '@/services/firebase/auth'
import { APP_NAME } from '@/config/constants'
import { useState, useMemo, useRef } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

export default function ClinicalLayout() {
  const { mode, isTransitioning } = useClinicalMode()
  const user = useAuthStore((s) => s.user)
  const isMobile = useUIStore((s) => s.isMobile)
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, () => setShowUserMenu(false), showUserMenu)

  const primaryMobileNav = useMemo(() => {
    if (mode === 'acute') {
      return [
        { path: '/on-call', icon: Phone, label: 'On-Call' },
        { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
        { path: '/labs', icon: FlaskConical, label: 'Labs' },
        { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
      ]
    }

    if (mode === 'clerking') {
      return [
        { path: '/clerking', icon: Stethoscope, label: 'Clerking' },
        { path: '/patients', icon: Users, label: 'Patients' },
        { path: '/on-call', icon: Phone, label: 'On-Call' },
        { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      ]
    }

    return [
      { path: '/', icon: LayoutDashboard, label: 'Home' },
      { path: '/patients', icon: Users, label: 'Patients' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/labs', icon: FlaskConical, label: 'Labs' },
    ]
  }, [mode])

  const moreNav = useMemo(() => {
    if (mode === 'acute') {
      return [
        { path: '/patients', icon: Users, label: 'Patients' },
      ]
    }

    if (mode === 'clerking') {
      return []
    }

    return [
      { path: '/on-call', icon: Phone, label: 'On-Call' },
      { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
    ]
  }, [mode])

  const isRouteActive = (path: string) => (
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )

  const isMoreActive = moreNav.some((item) => isRouteActive(item.path))

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
                  onClick={() => navigate('/mode')}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ward-text hover:bg-gray-50 min-h-[44px]"
                >
                  <Workflow className="h-4 w-4" />
                  Change Mode
                </button>
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
          {showMore && moreNav.length > 0 && (
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
                    const isActive = isRouteActive(item.path)
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
                const isActive = isRouteActive(item.path)
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
              {moreNav.length > 0 && (
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
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
