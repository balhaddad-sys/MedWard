import { useState } from 'react'
import {
  FlaskConical,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react'
import { clsx } from 'clsx'
import { SimpleLabUpload } from '@/components/Labs/SimpleLabUpload'
import { triggerHaptic } from '@/utils/haptics'
import type { AnalyzedLab } from '@/models/Lab'

interface LabsTabProps {
  patientId: string
  labs: AnalyzedLab[]
  onLabAdded?: (lab: AnalyzedLab) => void
}

const categoryColors: Record<string, string> = {
  CBC: 'bg-red-100 text-red-700',
  BMP: 'bg-blue-100 text-blue-700',
  CMP: 'bg-indigo-100 text-indigo-700',
  LFT: 'bg-amber-100 text-amber-700',
  Coagulation: 'bg-purple-100 text-purple-700',
  Cardiac: 'bg-pink-100 text-pink-700',
  Thyroid: 'bg-teal-100 text-teal-700',
  Urinalysis: 'bg-yellow-100 text-yellow-700',
  ABG: 'bg-cyan-100 text-cyan-700',
  Custom: 'bg-gray-100 text-gray-700',
  Unknown: 'bg-gray-100 text-gray-500',
}

export function LabsTab({ patientId, labs, onLabAdded }: LabsTabProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null)

  // Group labs by category
  const grouped = labs.reduce(
    (acc, lab) => {
      const cat = lab.category || 'Unknown'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(lab)
      return acc
    },
    {} as Record<string, AnalyzedLab[]>
  )

  const sortedCategories = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      {/* Labs grouped by category */}
      {sortedCategories.length === 0 ? (
        <div className="text-center py-8">
          <FlaskConical className="h-8 w-8 text-ward-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm text-ward-muted">No lab results yet</p>
        </div>
      ) : (
        sortedCategories.map((category) => (
          <div key={category} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                  categoryColors[category] || categoryColors.Unknown
                )}
              >
                {category}
              </span>
              <span className="text-xs text-ward-muted">
                {grouped[category].length} result{grouped[category].length > 1 ? 's' : ''}
              </span>
            </div>

            {grouped[category].map((lab) => {
              const isExpanded = expandedLabId === lab.id
              const visibleTests = isExpanded ? lab.tests : lab.tests.slice(0, 3)
              const hasMore = lab.tests.length > 3
              const abnormalCount = lab.tests.filter((t) => t.isAbnormal).length

              return (
                <div
                  key={lab.id}
                  className="bg-white rounded-lg border border-ward-border overflow-hidden"
                >
                  <button
                    onClick={() => {
                      triggerHaptic('tap')
                      setExpandedLabId(isExpanded ? null : lab.id)
                    }}
                    className="w-full flex items-center justify-between p-3 text-left touch"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon status={lab.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ward-text truncate">
                          {lab.labName || category}
                        </p>
                        <p className="text-xs text-ward-muted">
                          {lab.testDate
                            ? lab.testDate.toLocaleDateString()
                            : lab.analyzedAt.toLocaleDateString()}
                          {' | '}
                          {lab.tests.length} tests
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {abnormalCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          {abnormalCount}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-ward-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-ward-muted" />
                      )}
                    </div>
                  </button>

                  {/* Compact test display */}
                  <div className="border-t border-ward-border divide-y divide-ward-border">
                    {visibleTests.map((test, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          'flex items-center justify-between px-3 py-1.5 text-xs',
                          test.isAbnormal && 'bg-red-50'
                        )}
                      >
                        <span
                          className={clsx(
                            'font-medium',
                            test.isAbnormal ? 'text-red-700' : 'text-ward-text'
                          )}
                        >
                          {test.isAbnormal && (
                            <AlertTriangle className="h-3 w-3 text-red-500 inline mr-1" />
                          )}
                          {test.name}
                        </span>
                        <span
                          className={clsx(
                            'font-mono font-bold',
                            test.isAbnormal ? 'text-red-600' : 'text-ward-text'
                          )}
                        >
                          {test.value}
                          {test.unit && (
                            <span className="text-ward-muted font-normal ml-1">
                              {test.unit}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {!isExpanded && hasMore && (
                      <div className="px-3 py-1.5 text-center">
                        <span className="text-xs text-primary-600 font-medium">
                          +{lab.tests.length - 3} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Add Labs Button */}
      <button
        onClick={() => {
          triggerHaptic('tap')
          setShowUpload(true)
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-ward-border text-sm font-medium text-ward-muted hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50 transition-colors touch min-h-[48px]"
      >
        <Plus className="h-4 w-4" />
        Add Labs
      </button>

      {/* Upload Modal */}
      {showUpload && (
        <SimpleLabUpload
          patientId={patientId}
          onComplete={(lab) => {
            onLabAdded?.(lab)
            setShowUpload(false)
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: AnalyzedLab['status'] }) {
  switch (status) {
    case 'confirmed':
      return <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
    default:
      return <FlaskConical className="h-4 w-4 text-ward-muted flex-shrink-0" />
  }
}
