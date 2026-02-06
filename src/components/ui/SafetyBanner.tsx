import { AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

interface SafetyBannerProps {
  message: string
  type?: 'warning' | 'critical'
  dismissible?: boolean
  className?: string
}

export function SafetyBanner({ message, type = 'warning', dismissible = true, className }: SafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-lg border',
        type === 'critical'
          ? 'bg-red-50 border-red-300 text-red-800'
          : 'bg-yellow-50 border-yellow-300 text-yellow-800',
        type === 'critical' && 'animate-pulse-critical',
        className
      )}
      role="alert"
    >
      <AlertTriangle className={clsx('h-5 w-5 flex-shrink-0', type === 'critical' ? 'text-red-600' : 'text-yellow-600')} />
      <p className="text-sm font-medium flex-1">{message}</p>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
