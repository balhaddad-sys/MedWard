import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useClinicalMode } from '../context/ModeContext'
import type { ClinicalMode } from '../config/modes'
import { triggerHaptic } from '../utils/haptics'
import { SyncBadge } from '../components/SyncBadge'
import { clsx } from 'clsx'
import {
  ClipboardList,
  Siren,
  Stethoscope,
  Bell,
  User,
  LogOut,
  Lock,
  Unlock,
  LayoutDashboard,
  CheckSquare,
  FlaskConical,
  ArrowRightLeft,
  Users,
  Bot,
  Pill,
  Settings,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { signOut } from '@/services/firebase/auth'
import { APP_NAME } from '@/config/constants'
import { useState } from 'react'

export default function ClinicalLayout() {
  const { mode, isTransitioning, isModeLocked, setModeLocked } = useClinicalMode()
  const user = useAuthStore((s) => s.user)
  const isMobile = useUIStore((s) => s.isMobile)
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const desktopNav = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/labs', icon: FlaskConical, label: 'Labs' },
    { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
  ]

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
      {/* Adaptive Header */}
      <header
        className={clsx(
          'h-14 flex items-center justify-between px-3 sm:px-4 border-b shrink-0 transition-colors duration-300 z-30',
          mode === 'ward' && 'bg-white border-neutral-200',
          mode === 'acute' && 'bg-slate-900 border-slate-800 text-white',
          mode === 'clinic' && 'bg-stone-50 border-stone-200'
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer touch" onClick={() => navigate('/')}>
            <div
              className={clsx(
                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                mode === 'acute' ? 'bg-red-600' : 'bg-primary-600'
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

          {/* Desktop navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-1 ml-4">
              {desktopNav.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch',
                      isActive
                        ? mode === 'acute'
                          ? 'bg-white/10 text-white'
                          : 'bg-primary-50 text-primary-700'
                        : mode === 'acute'
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-ward-muted hover:bg-gray-50 hover:text-ward-text'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Indicator Pill */}
          <div
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
              mode === 'ward' && 'bg-blue-100 text-blue-700',
              mode === 'acute' && 'bg-red-600 text-white animate-pulse',
              mode === 'clinic' && 'bg-stone-200 text-stone-700'
            )}
          >
            {mode}
          </div>

          {/* Mode Lock */}
          <button
            onClick={() => {
              triggerHaptic('tap')
              setModeLocked(!isModeLocked)
            }}
            className={clsx(
              'p-1.5 rounded-lg transition-colors touch min-h-[36px] min-w-[36px] flex items-center justify-center',
              mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
            aria-label={isModeLocked ? 'Unlock mode switching' : 'Lock current mode'}
          >
            {isModeLocked ? (
              <Lock className="h-4 w-4 text-amber-500" />
            ) : (
              <Unlock
                className={clsx(
                  'h-4 w-4',
                  mode === 'acute' ? 'text-slate-400' : 'text-ward-muted'
                )}
              />
            )}
          </button>

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
                mode === 'acute' ? 'text-slate-400' : 'text-ward-muted'
              )}
            />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
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
                  mode === 'acute' ? 'bg-slate-700' : 'bg-primary-100'
                )}
              >
                <User
                  className={clsx(
                    'h-4 w-4',
                    mode === 'acute' ? 'text-slate-300' : 'text-primary-700'
                  )}
                />
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in z-50"
                onMouseLeave={() => setShowUserMenu(false)}
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

      {/* Morphing Content Area */}
      <main
        className={clsx(
          'flex-1 overflow-y-auto relative transition-opacity duration-150',
          isTransitioning ? 'opacity-50 blur-sm' : 'opacity-100',
          mode === 'acute' ? 'bg-[#0f0f0f]' : mode === 'clinic' ? 'bg-[#faf8f6]' : 'bg-[#f8fafc]'
        )}
      >
        <div className="p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mode Switcher + Nav) */}
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
                    ? 'bg-slate-900 border-slate-800'
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
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-primary-50 text-primary-600'
                            : mode === 'acute'
                              ? 'text-slate-400 hover:bg-white/5'
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
                ? 'bg-slate-900 border-slate-800'
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
                          ? 'text-red-400'
                          : 'text-primary-600'
                        : mode === 'acute'
                          ? 'text-slate-500'
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
                      ? 'text-red-400'
                      : 'text-primary-600'
                    : mode === 'acute'
                      ? 'text-slate-500'
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
                mode === 'acute' ? 'border-slate-800' : 'border-neutral-100'
              )}
            >
              <ModeNavButton id="ward" label="Ward" Icon={ClipboardList} />
              <ModeNavButton id="acute" label="Acute" Icon={Siren} />
              <ModeNavButton id="clinic" label="Clinic" Icon={Stethoscope} />
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
        isActive && id === 'acute' && 'text-red-500 bg-red-500/10',
        isActive && id === 'clinic' && 'text-stone-700 bg-stone-100',
        !isActive &&
          (mode === 'acute' ? 'text-slate-500 hover:text-slate-300' : 'text-neutral-400 hover:text-neutral-600')
      )}
      aria-label={`Switch to ${label} mode`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}
