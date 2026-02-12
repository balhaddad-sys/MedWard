import { clsx } from 'clsx'
import { useUIStore } from '@/stores/uiStore'

export interface LabResultRow {
  test: string
  value: number | string
  unit: string
  flag: 'Critical' | 'High' | 'Low' | 'Normal' | string
  refRange?: string
}

export interface LabResultData {
  patientName?: string
  collectionDate?: string
  results: LabResultRow[]
  summary?: string
}

interface LabResultTableProps {
  data: LabResultData
  variant?: 'light' | 'dark'
  compact?: boolean
}

export function LabResultTable({ data, variant = 'dark', compact = false }: LabResultTableProps) {
  if (!data || !data.results || data.results.length === 0) return null

  const isDark = variant === 'dark'
  const isMobile = useUIStore((s) => s.isMobile)

  return (
    <div
      className={clsx(
        'w-full rounded-lg border overflow-hidden',
        isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-neutral-200 shadow-sm'
      )}
    >
      {/* Header */}
      {(data.patientName || data.collectionDate) && (
        <div
          className={clsx(
            'px-3 py-2 border-b flex flex-wrap justify-between items-center gap-2',
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-neutral-50 border-neutral-200'
          )}
        >
          <span
            className={clsx(
              'text-xs font-bold uppercase tracking-wide',
              isDark ? 'text-slate-400' : 'text-neutral-500'
            )}
          >
            {data.patientName || 'Lab Results'}
          </span>
          {data.collectionDate && (
            <span
              className={clsx(
                'text-xs',
                isDark ? 'text-slate-500' : 'text-neutral-400'
              )}
            >
              {data.collectionDate}
            </span>
          )}
        </div>
      )}

      {/* Mobile Card View or Desktop Table View */}
      {isMobile ? (
        // Mobile: Card-based view
        <div className="space-y-2 p-2">
          {data.results.map((row, i) => {
            const flagNorm = row.flag?.toLowerCase() || 'normal'
            const isCritical = flagNorm === 'critical'
            const isHigh = flagNorm === 'high'
            const isLow = flagNorm === 'low'

            return (
              <div
                key={`${row.test}-${i}`}
                className={clsx(
                  'p-3 rounded-lg border transition-colors',
                  isDark ? 'border-slate-700 bg-slate-800/40' : 'border-neutral-200 bg-white',
                  isCritical && (isDark ? 'bg-red-950/30 border-red-800' : 'bg-red-50 border-red-200')
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={clsx('text-sm font-medium', isDark ? 'text-slate-200' : 'text-neutral-800')}>
                    {row.test}
                  </span>
                  {(isCritical || isHigh || isLow) && (
                    <span
                      className={clsx(
                        'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0',
                        isCritical && 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
                        isHigh && 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                        isLow && 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      )}
                    >
                      {isCritical ? 'CRIT' : isHigh ? 'HIGH' : 'LOW'}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={clsx(
                      'text-2xl font-mono font-semibold',
                      isCritical
                        ? 'text-red-400'
                        : isHigh
                          ? 'text-amber-400'
                          : isLow
                            ? 'text-blue-400'
                            : isDark
                              ? 'text-slate-200'
                              : 'text-neutral-800'
                    )}
                  >
                    {row.value}
                  </span>
                  <span className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-neutral-400')}>
                    {row.unit}
                  </span>
                </div>
                {row.refRange && (
                  <div className={clsx('text-xs mt-1', isDark ? 'text-slate-600' : 'text-neutral-400')}>
                    Ref: {row.refRange}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // Desktop: Table view
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={clsx(
                  'text-xs font-bold uppercase tracking-wider',
                  isDark ? 'bg-slate-800/40 text-slate-500' : 'bg-neutral-100 text-neutral-500'
                )}
              >
                <th className="text-left px-3 py-2">Test</th>
                <th className="text-right px-3 py-2">Value</th>
                <th className="text-center px-3 py-2">Flag</th>
                {!compact && <th className="text-right px-3 py-2 hidden sm:table-cell">Ref</th>}
              </tr>
            </thead>
            <tbody>
              {data.results.map((row, i) => {
                const flagNorm = row.flag?.toLowerCase() || 'normal'
                const isCritical = flagNorm === 'critical'
                const isHigh = flagNorm === 'high'
                const isLow = flagNorm === 'low'
                return (
                  <tr
                    key={`${row.test}-${i}`}
                    className={clsx(
                      'border-b last:border-0 transition-colors',
                      isDark
                        ? 'border-slate-700/60 hover:bg-slate-800/40'
                        : 'border-neutral-100 hover:bg-neutral-50',
                      isCritical && (isDark ? 'bg-red-950/30' : 'bg-red-50/60')
                    )}
                  >
                    <td
                      className={clsx(
                        'px-3 py-2 font-medium',
                        isDark ? 'text-slate-200' : 'text-neutral-800'
                      )}
                    >
                      {row.test}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span
                        className={clsx(
                          'font-semibold',
                          isCritical
                            ? 'text-red-400'
                            : isHigh
                              ? 'text-amber-400'
                              : isLow
                                ? 'text-blue-400'
                                : isDark
                                  ? 'text-slate-200'
                                  : 'text-neutral-800'
                        )}
                      >
                        {row.value}
                      </span>
                      <span
                        className={clsx(
                          'text-xs ml-1',
                          isDark ? 'text-slate-500' : 'text-neutral-400'
                        )}
                      >
                        {row.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCritical && (
                        <span className="inline-block bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-red-500/30 animate-pulse">
                          CRIT
                        </span>
                      )}
                      {isHigh && (
                        <span className="inline-block bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-amber-500/30">
                          HIGH
                        </span>
                      )}
                      {isLow && (
                        <span className="inline-block bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-blue-500/30">
                          LOW
                        </span>
                      )}
                    </td>
                    {!compact && (
                      <td
                        className={clsx(
                          'px-3 py-2 text-right text-xs hidden sm:table-cell',
                          isDark ? 'text-slate-600' : 'text-neutral-400'
                        )}
                      >
                        {row.refRange || '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      {data.summary && (
        <div
          className={clsx(
            'px-3 py-2.5 text-sm italic border-t',
            isDark
              ? 'bg-blue-950/30 text-blue-300/80 border-slate-700'
              : 'bg-blue-50 text-blue-800 border-blue-100'
          )}
        >
          {data.summary}
        </div>
      )}
    </div>
  )
}

export default LabResultTable
