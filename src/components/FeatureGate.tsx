import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, ShieldOff } from 'lucide-react'
import { remoteConfigService } from '@/services/RemoteConfigService'

interface FeatureGateProps {
  feature: 'ai' | 'labs' | 'smarttext'
  fallback?: ReactNode
  children: ReactNode
}

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const [isEnabled, setIsEnabled] = useState(true)
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkFeature = async () => {
      try {
        const enabled = await remoteConfigService.isFeatureEnabled(feature)
        setIsEnabled(enabled)

        if (!enabled) {
          const msg = await remoteConfigService.getMaintenanceMessage(feature)
          setMaintenanceMessage(msg)
        }
      } catch {
        // Default to enabled if Remote Config unavailable
        setIsEnabled(true)
      }
    }

    checkFeature()

    // Re-check periodically
    const interval = setInterval(checkFeature, 60000)
    return () => clearInterval(interval)
  }, [feature])

  if (!isEnabled) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <ShieldOff className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-ward-text mb-2">
          Feature Temporarily Unavailable
        </h3>
        <p className="text-sm text-ward-muted max-w-sm">
          {maintenanceMessage ||
            `The ${feature} feature is currently disabled for maintenance. Please try again later.`}
        </p>
        <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-700">
            This is controlled by your administrator
          </span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
