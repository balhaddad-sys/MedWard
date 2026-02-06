import { AlertTriangle, X, XCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { useFeatureFlag, useConfigString } from '@/hooks/useFeatureFlag'

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

export function MaintenanceBanner() {
  const isMaintenanceMode = useFeatureFlag('maintenance_mode')
  const announcementText = useConfigString('announcement_banner')

  if (isMaintenanceMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ward-text mb-2">Maintenance Mode</h1>
          <p className="text-ward-muted mb-6">
            MedWard Pro is temporarily unavailable for scheduled maintenance.
            Please try again in a few minutes.
          </p>
          <p className="text-sm text-ward-muted">
            If this persists, contact your system administrator.
          </p>
        </div>
      </div>
    )
  }

  if (announcementText && announcementText.trim()) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Info className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 flex-1">{announcementText}</p>
        </div>
      </div>
    )
  }

  return null
}
