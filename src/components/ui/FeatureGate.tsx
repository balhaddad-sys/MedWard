import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface FeatureGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallbackText?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback = null,
  showFallbackText = true,
}: FeatureGateProps) {
  const isEnabled = useFeatureFlag(feature)

  if (!isEnabled) {
    if (fallback) return <>{fallback}</>
    if (showFallbackText) {
      return (
        <div className="text-xs text-ward-muted italic py-2">
          This feature is temporarily unavailable
        </div>
      )
    }
    return null
  }

  return <>{children}</>
}

export function FeatureDisabledGate({
  feature,
  children,
}: {
  feature: string
  children: React.ReactNode
}) {
  const isEnabled = useFeatureFlag(feature)
  if (isEnabled) return null
  return <>{children}</>
}
