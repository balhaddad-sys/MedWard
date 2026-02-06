import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CheckSquare, ArrowRightLeft, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'

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
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Detect virtual keyboard open/close via visualViewport resize
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      // If the visual viewport height is significantly less than the window height,
      // the virtual keyboard is likely open
      const threshold = window.innerHeight * 0.75
      setKeyboardOpen(viewport.height < threshold)
    }

    viewport.addEventListener('resize', handleResize)
    return () => viewport.removeEventListener('resize', handleResize)
  }, [])

  // Hide BottomNav when keyboard is open
  if (keyboardOpen) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ward-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] rounded-xl transition-all active:scale-95',
                isActive
                  ? 'bg-primary-50 px-4 py-1.5'
                  : 'px-3 py-2 text-ward-muted'
              )}
            >
              <item.icon
                className={clsx(
                  'transition-all',
                  isActive
                    ? 'h-[22px] w-[22px] text-primary-600'
                    : 'h-5 w-5 text-ward-muted'
                )}
              />
              <span
                className={clsx(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary-600' : 'text-ward-muted'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
