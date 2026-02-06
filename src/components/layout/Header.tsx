import { Menu, Bell, User, LogOut } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { ModeSelector } from './ModeSelector'
import { APP_NAME } from '@/config/constants'
import { signOut } from '@/services/firebase/auth'
import { useState } from 'react'

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const isMobile = useUIStore((s) => s.isMobile)
  const user = useAuthStore((s) => s.user)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-ward-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-ward-muted" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-ward-text hidden sm:block">{APP_NAME}</span>
          </div>
        </div>

        <ModeSelector />

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-ward-muted" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-4 w-4 text-primary-700" />
              </div>
              {!isMobile && (
                <span className="text-sm font-medium text-ward-text">{user?.displayName || 'User'}</span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in">
                <div className="px-4 py-2 border-b border-ward-border">
                  <p className="text-sm font-medium">{user?.displayName}</p>
                  <p className="text-xs text-ward-muted">{user?.role}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
