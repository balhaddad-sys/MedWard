import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME } from '@/config/constants'
import { signOut } from '@/services/firebase/auth'
import { useState, useRef, useEffect } from 'react'
import type { WardMode } from '@/types'

const modeLabels: Record<WardMode, string> = {
  clinical: 'Clinical',
  triage: 'Lab Triage',
  handover: 'Handover',
}

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const isMobile = useUIStore((s) => s.isMobile)
  const currentMode = useUIStore((s) => s.currentMode)
  const setCurrentMode = useUIStore((s) => s.setCurrentMode)
  const user = useAuthStore((s) => s.user)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
  }

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-ward-border shadow-sm">
      <div className="flex items-center justify-between h-[52px] px-4">
        {/* Left: hamburger (mobile) + logo + app name */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-ward-muted" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-semibold text-sm text-ward-text truncate">
              {APP_NAME}
            </span>
          </div>
        </div>

        {/* Center: Mode pill selector */}
        <div className="relative" ref={modeMenuRef}>
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 active:bg-primary-200 transition-colors"
          >
            {modeLabels[currentMode]}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showModeMenu && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in z-50">
              {(Object.keys(modeLabels) as WardMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setCurrentMode(mode)
                    setShowModeMenu(false)
                  }}
                  className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                    currentMode === mode
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-ward-text hover:bg-gray-50'
                  }`}
                >
                  {modeLabels[mode]}
                  {currentMode === mode && (
                    <span className="ml-auto text-primary-600 text-xs">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: sync dot + bell + avatar */}
        <div className="flex items-center gap-1">
          {/* Sync indicator */}
          <div className="p-2 flex items-center justify-center" title="Synced">
            <span className="h-2 w-2 rounded-full bg-green-500 block" />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors">
            <Bell className="h-5 w-5 text-ward-muted" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="User menu"
            >
              <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary-700" />
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-ward-border py-1 animate-fade-in z-50">
                <div className="px-4 py-3 border-b border-ward-border">
                  <p className="text-sm font-medium text-ward-text truncate">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-ward-muted mt-0.5">{user?.role || 'Clinician'}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
