import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Users, CheckSquare, ArrowRightLeft, Settings, Bot, FlaskConical, Pill, MoreHorizontal, X, Stethoscope, Phone } from 'lucide-react'
import { clsx } from 'clsx'

const primaryNav = [
  { path: '/clerking', icon: Stethoscope, label: 'Clerking' },
  { path: '/on-call', icon: Phone, label: 'On-Call' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
]

const moreNav = [
  { path: '/labs', icon: FlaskConical, label: 'Labs' },
  { path: '/ai', icon: Bot, label: 'AI' },
  { path: '/drugs', icon: Pill, label: 'Drug Info' },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = moreNav.some((item) => location.pathname === item.path)

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-[60px] left-0 right-0 bg-white border-t border-ward-border rounded-t-2xl p-4 safe-bottom animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-ward-text">More</span>
              <button onClick={() => setShowMore(false)} aria-label="Close menu" className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-ward-muted" />
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
                      'flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl transition-colors',
                      isActive ? 'bg-primary-50 text-primary-600' : 'text-ward-muted hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ward-border safe-bottom">
        <div className="flex items-center justify-around py-1">
          {primaryNav.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-h-[48px] min-w-[48px]',
                  isActive ? 'text-primary-600' : 'text-ward-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-h-[48px] min-w-[48px]',
              isMoreActive || showMore ? 'text-primary-600' : 'text-ward-muted'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
