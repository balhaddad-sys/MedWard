import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CheckSquare, ArrowRightLeft, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ward-border safe-bottom">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-h-[48px] min-w-[48px] rounded-lg transition-colors active:bg-gray-100',
                isActive ? 'text-primary-600' : 'text-ward-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
