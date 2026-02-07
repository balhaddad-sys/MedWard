import { Bell, User, LogOut, LayoutDashboard, CheckSquare, FlaskConical, ArrowRightLeft, Users } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { ModeSelector } from './ModeSelector'
import { APP_NAME } from '@/config/constants'
import { signOut } from '@/services/firebase/auth'
import { useState } from 'react'
import { clsx } from 'clsx'

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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-ward-border shadow-sm">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-ward-text hidden sm:block">{APP_NAME}</span>
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
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-ward-muted hover:bg-gray-50 hover:text-ward-text'
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

        <div className="flex-shrink min-w-0 overflow-x-auto scrollbar-hide">
          <ModeSelector />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Bell className="h-5 w-5 text-ward-muted" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary-700" />
              </div>
              {!isMobile && (
                <span className="text-sm font-medium text-ward-text">{user?.displayName || 'User'}</span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in z-50">
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
