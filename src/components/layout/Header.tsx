import { Bell, User, LogOut, LayoutDashboard, CheckSquare, FlaskConical, ArrowRightLeft, Users, ClipboardList, Siren, Stethoscope } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useClinicalMode } from '@/context/useClinicalMode'
import type { ClinicalMode } from '@/config/modes'
import { triggerHaptic } from '@/utils/haptics'
import { APP_NAME } from '@/config/constants'
import { signOut } from '@/services/firebase/auth'
import { useState, useRef } from 'react'
import { clsx } from 'clsx'
import { useClickOutside } from '@/hooks/useClickOutside'

const desktopNav = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/labs', icon: FlaskConical, label: 'Labs' },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
]

export function Header() {
  const isMobile = useUIStore((s) => s.isMobile)
  const user = useAuthStore((s) => s.user)
  const { mode, setMode } = useClinicalMode()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, () => setShowUserMenu(false), showUserMenu)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className={clsx(
      'sticky top-0 z-30 border-b shadow-sm transition-colors duration-300 safe-top safe-x',
      mode === 'acute' ? 'bg-gray-900 border-gray-700 text-white' : mode === 'clerking' ? 'bg-stone-50 border-stone-200' : 'bg-white border-ward-border'
    )}>
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className={clsx(
              'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
              mode === 'acute' ? 'bg-amber-500' : 'bg-primary-600'
            )}>
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className={clsx(
              'font-semibold hidden sm:block',
              mode === 'acute' ? 'text-white' : 'text-ward-text'
            )}>{APP_NAME}</span>
          </div>
          {/* Desktop navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-1 ml-4">
              {desktopNav.map((item) => {
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? mode === 'acute' ? 'bg-amber-500/15 text-amber-400' : 'bg-primary-50 text-primary-700'
                        : mode === 'acute' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-ward-muted hover:bg-gray-50 hover:text-ward-text'
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

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mode Switcher */}
          <div className={clsx(
            'flex items-center gap-0.5 p-1 rounded-lg',
            mode === 'acute' ? 'bg-gray-800/60' : 'bg-gray-100'
          )}>
            <ModeButton id="ward" label="Ward" Icon={ClipboardList} currentMode={mode} setMode={setMode} />
            <ModeButton id="acute" label="On-Call" Icon={Siren} currentMode={mode} setMode={setMode} />
            <ModeButton id="clerking" label="Clerking" Icon={Stethoscope} currentMode={mode} setMode={setMode} />
          </div>

          <button className={clsx(
            'relative p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
            mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          )}>
            <Bell className={clsx('h-5 w-5', mode === 'acute' ? 'text-slate-400' : 'text-ward-muted')} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={clsx(
                'flex items-center gap-2 p-1.5 rounded-lg transition-colors min-h-[44px]',
                mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              )}
            >
              <div className={clsx(
                'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                mode === 'acute' ? 'bg-slate-600/60' : 'bg-primary-100'
              )}>
                <User className={clsx('h-4 w-4', mode === 'acute' ? 'text-slate-300' : 'text-primary-700')} />
              </div>
              {!isMobile && (
                <span className={clsx('text-sm font-medium', mode === 'acute' ? 'text-white' : 'text-ward-text')}>
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
                  <p className="text-sm font-medium">{user?.displayName}</p>
                  <p className="text-xs text-ward-muted">{user?.role}</p>
                </div>
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
      </div>
    </header>
  )
}

function ModeButton({ id, label, Icon, currentMode, setMode }: {
  id: ClinicalMode
  label: string
  Icon: React.ElementType
  currentMode: ClinicalMode
  setMode: (mode: ClinicalMode) => void
}) {
  const isActive = currentMode === id
  return (
    <button
      onClick={() => { triggerHaptic('tap'); setMode(id) }}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium',
        isActive && id === 'ward' && 'text-blue-600 bg-blue-50',
        isActive && id === 'acute' && 'text-amber-500 bg-amber-500/10',
        isActive && id === 'clerking' && 'text-stone-700 bg-stone-100',
        !isActive && (currentMode === 'acute' ? 'text-gray-500 hover:text-gray-300' : 'text-neutral-400 hover:text-neutral-600')
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}
