import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CheckSquare, ArrowRightLeft, Settings, Activity, FlaskConical, Bot, Pill } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/uiStore'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/labs', icon: FlaskConical, label: 'Lab Analysis' },
  { path: '/ai', icon: Bot, label: 'AI Assistant' },
  { path: '/drugs', icon: Pill, label: 'Drug Info' },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentMode = useUIStore((s) => s.currentMode)

  return (
    <aside className="w-60 min-h-[calc(100vh-64px)] bg-white border-r border-ward-border p-4 flex-shrink-0">
      <div className="mb-6 px-3">
        <div className="flex items-center gap-2 text-xs text-ward-muted uppercase tracking-wider font-medium">
          {currentMode === 'ward' && <Activity className="h-3.5 w-3.5" />}
          {currentMode === 'clinic' && <FlaskConical className="h-3.5 w-3.5" />}
          {currentMode === 'acute' && <ArrowRightLeft className="h-3.5 w-3.5" />}
          {currentMode} mode
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
    </aside>
  )
}
