import { useState } from 'react'
import { clsx } from 'clsx'
import { Clock, Eye, Image, X, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sparkline } from '@/components/ui/Sparkline'
import type { LabPanel as LabPanelType } from '@/types'
import { formatTimestamp, formatLabValue } from '@/utils/formatters'
import { getLabFlagLabel } from '@/utils/labUtils'

interface LabPanelProps {
  panel: LabPanelType
  trendData?: Record<string, number[]>
  onReview?: () => void
  onDelete?: () => void
}

export function LabPanelComponent({ panel, trendData, onReview, onDelete }: LabPanelProps) {
  const [showImage, setShowImage] = useState(false)
  const hasCritical = panel.values?.some((v) => v.flag === 'critical_low' || v.flag === 'critical_high') ?? false

  return (
    <>
      <Card className={clsx(
        hasCritical && 'border-red-300 dark:border-red-800'
      )}>
        <CardHeader className="border-b border-ward-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base mb-0.5">{panel.panelName}</CardTitle>
              <div className="text-xs text-ward-muted flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatTimestamp(panel.collectedAt)}
              </div>
            </div>
            {hasCritical && (
              <Badge variant="danger" size="sm" className="shrink-0">
                CRITICAL
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge
              variant={(panel.status ?? 'pending') === 'reviewed' ? 'success' : (panel.status ?? 'pending') === 'resulted' ? 'info' : 'default'}
              size="sm"
            >
              {panel.status ?? 'pending'}
            </Badge>

            <Badge variant="default" size="sm">
              {panel.category}
            </Badge>

            <div className="flex gap-1 ml-auto">
              {panel.imageUrl && (
                <button
                  onClick={() => setShowImage(true)}
                  className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 px-2 py-1 min-h-[44px]"
                >
                  <Image className="h-3 w-3" />
                </button>
              )}

              {onReview && (panel.status ?? 'pending') === 'resulted' && (
                <button
                  onClick={onReview}
                  className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 px-2 py-1 min-h-[44px]"
                >
                  <Eye className="h-3 w-3" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 px-2 py-1 min-h-[44px]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="p-3 space-y-1.5">
          {(panel.values ?? []).map((value, _index) => {
            const isCritical = value.flag === 'critical_low' || value.flag === 'critical_high'
            const isAbnormal = value.flag && value.flag !== 'normal'

            return (
              <div
                key={value.name}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded-lg border transition-colors',
                  isCritical && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
                  isAbnormal && !isCritical && 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
                  !isAbnormal && 'border-ward-border bg-ward-card'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={clsx(
                    'text-xs font-medium truncate',
                    isCritical ? 'text-red-700 dark:text-red-300' : isAbnormal ? 'text-amber-700 dark:text-amber-300' : 'text-ward-text'
                  )}>
                    {value.name}
                  </span>

                  <div className="flex items-baseline gap-1">
                    <span className={clsx(
                      'text-base font-semibold font-mono',
                      isCritical ? 'text-red-600 dark:text-red-400' :
                      isAbnormal ? 'text-amber-600 dark:text-amber-400' :
                      'text-ward-text'
                    )}>
                      {formatLabValue(value.value)}
                    </span>
                    <span className="text-xs text-ward-muted">{value.unit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {value.flag && value.flag !== 'normal' && (
                    <Badge
                      variant={isCritical ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {isCritical ? 'CRIT' : getLabFlagLabel(value.flag)}
                    </Badge>
                  )}

                  {trendData?.[value.name] && (
                    <Sparkline
                      data={trendData[value.name]}
                      width={40}
                      height={20}
                      color={isCritical ? '#dc2626' : isAbnormal ? '#f59e0b' : '#3b82f6'}
                      referenceMin={value.referenceMin}
                      referenceMax={value.referenceMax}
                    />
                  )}
                </div>
              </div>
            )
          })}
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
