import { useState } from 'react'
import { clsx } from 'clsx'
import { Clock, CheckCircle, Eye, Image, X } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sparkline } from '@/components/ui/Sparkline'
import type { LabPanel as LabPanelType } from '@/types'
import { formatTimestamp, formatLabValue } from '@/utils/formatters'
import { getLabFlagColor, getLabFlagLabel, getLabFlagBg } from '@/utils/labUtils'

interface LabPanelProps {
  panel: LabPanelType
  trendData?: Record<string, number[]>
  onReview?: () => void
}

export function LabPanelComponent({ panel, trendData, onReview }: LabPanelProps) {
  const [showImage, setShowImage] = useState(false)
  const hasCritical = panel.values?.some((v) => v.flag === 'critical_low' || v.flag === 'critical_high') ?? false

  return (
    <>
      <Card className={clsx(hasCritical && 'border-red-300 shadow-red-100')}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{panel.panelName}</CardTitle>
            {hasCritical && <Badge variant="danger" pulse size="sm">CRITICAL</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {panel.imageUrl && (
              <button
                onClick={() => setShowImage(true)}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Image className="h-3 w-3" /> View Image
              </button>
            )}
            <Badge variant={(panel.status ?? 'pending') === 'reviewed' ? 'success' : (panel.status ?? 'pending') === 'resulted' ? 'info' : 'default'} size="sm">
              {(panel.status ?? 'pending') === 'reviewed' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
              {panel.status ?? 'pending'}
            </Badge>
            {onReview && (panel.status ?? 'pending') === 'resulted' && (
              <button onClick={onReview} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Review
              </button>
            )}
          </div>
        </CardHeader>
        <div className="text-xs text-ward-muted mb-3">{formatTimestamp(panel.collectedAt)}</div>
        <div className="space-y-1.5">
          {(panel.values ?? []).map((value) => (
            <div key={value.name} className={clsx('flex items-center justify-between px-2 py-1.5 rounded-lg border', getLabFlagBg(value.flag))}>
              <span className="text-xs text-ward-muted w-24 flex-shrink-0">{value.name}</span>
              <span className={clsx('text-sm font-mono font-medium flex-1 text-center', getLabFlagColor(value.flag))}>
                {formatLabValue(value.value)}
              </span>
              <span className="text-[10px] text-ward-muted w-16 text-right">{value.unit}</span>
              {value.flag && value.flag !== 'normal' && (
                <Badge variant={value.flag.startsWith('critical') ? 'danger' : 'warning'} size="sm" className="ml-2">
                  {getLabFlagLabel(value.flag)}
                </Badge>
              )}
              {trendData?.[value.name] && (
                <Sparkline data={trendData[value.name]} width={60} height={20} color={value.flag?.startsWith('critical') ? '#dc2626' : '#3b82f6'} className="ml-2" referenceMin={value.referenceMin} referenceMax={value.referenceMax} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Lab image lightbox */}
      {showImage && panel.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowImage(false)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowImage(false)}
              className="absolute -top-3 -right-3 z-10 bg-white rounded-full p-1.5 shadow-lg text-ward-muted hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={panel.imageUrl}
              alt="Lab report image"
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </>
  )
}
