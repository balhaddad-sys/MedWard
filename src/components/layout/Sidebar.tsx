import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowRightLeft,
  Settings,
  Activity,
  FlaskConical,
  LogOut,
  AlertTriangle,
  ListChecks,
  TestTube,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/services/firebase/auth'
import { useState } from 'react'
import type { WardMode } from '@/types'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

const modes: { id: WardMode; label: string; icon: React.ElementType }[] = [
  { id: 'clinical', label: 'Clinical', icon: Activity },
  { id: 'triage', label: 'Lab Triage', icon: FlaskConical },
  { id: 'handover', label: 'Handover', icon: ArrowRightLeft },
]

interface QuickFilter {
  id: string
  label: string
  icon: React.ElementType
}

const quickFilters: QuickFilter[] = [
  { id: 'critical', label: 'Critical Only', icon: AlertTriangle },
  { id: 'pending', label: 'Pending Tasks', icon: ListChecks },
  { id: 'todayLabs', label: "Today's Labs", icon: TestTube },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentMode = useUIStore((s) => s.currentMode)
  const setCurrentMode = useUIStore((s) => s.setCurrentMode)
  const isMobile = useUIStore((s) => s.isMobile)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const user = useAuthStore((s) => s.user)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const handleNavigate = (path: string) => {
    navigate(path)
    if (isMobile) setSidebarOpen(false)
  }

  const handleModeChange = (mode: WardMode) => {
    setCurrentMode(mode)
    if (isMobile) setSidebarOpen(false)
  }

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filterId)) {
        next.delete(filterId)
      } else {
        next.add(filterId)
      }
      return next
    })
  }

  const handleSignOut = async () => {
    setSidebarOpen(false)
    await signOut()
  }

  return (
    <aside className="w-72 h-full bg-white flex flex-col overflow-y-auto">
      {/* Mode Switch Section */}
      <div className="p-4 border-b border-ward-border">
        <p className="text-xs font-medium text-ward-muted uppercase tracking-wider mb-3">
          Mode
        </p>
        <div className="space-y-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={clsx(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentMode === mode.id
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                  : 'text-ward-muted hover:bg-gray-50 hover:text-ward-text'
              )}
            >
              <div
                className={clsx(
                  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  currentMode === mode.id
                    ? 'bg-primary-100'
                    : 'bg-gray-100'
                )}
              >
                <mode.icon
                  className={clsx(
                    'h-4 w-4',
                    currentMode === mode.id ? 'text-primary-600' : 'text-ward-muted'
                  )}
                />
              </div>
              {mode.label}
              {currentMode === mode.id && (
                <span className="ml-auto h-2 w-2 rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filters Section */}
      <div className="p-4 border-b border-ward-border">
        <p className="text-xs font-medium text-ward-muted uppercase tracking-wider mb-3">
          Quick Filters
        </p>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => {
            const isActive = activeFilters.has(filter.id)
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                    : 'bg-gray-100 text-ward-muted hover:bg-gray-200 hover:text-ward-text'
                )}
              >
                <filter.icon className="h-3 w-3" />
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sync Status */}
      <div className="px-4 py-3 border-b border-ward-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs text-ward-muted">Synced</span>
          <span className="text-xs text-gray-300 mx-1">|</span>
          <span className="text-xs text-ward-muted">Last sync: 2m ago</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-4 flex-1">
        <p className="text-xs font-medium text-ward-muted uppercase tracking-wider mb-3">
          Navigation
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={clsx(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-ward-muted hover:bg-gray-50 hover:text-ward-text'
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Account Section */}
      <div className="p-4 border-t border-ward-border mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary-700">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ward-text truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-ward-muted truncate">
              {user?.role || 'Clinician'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
