import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { clsx } from 'clsx'
import type { LabFlag } from '@/types'

export interface LabTestResult {
  code: string
  name: string
  value: number
  unit: string
  refLow: number
  refHigh: number
  flag: LabFlag | string
  previousValue?: number
}

interface LabResultRowProps {
  test: LabTestResult
}

export function LabResultRow({ test }: LabResultRowProps) {
  const flag = (test.flag || 'normal').toLowerCase()
  const isHigh = flag === 'high' || flag === 'critical_high'
  const isLow = flag === 'low' || flag === 'critical_low'
  const isCritical = flag === 'critical_high' || flag === 'critical_low'

  // Gauge position: 0-100 within ref range, can overflow
  const range = test.refHigh - test.refLow
  const position = range > 0 ? ((test.value - test.refLow) / range) * 100 : 50
  // Map to visual: ref range occupies 20%-80% of the bar
  const visualPos = 20 + (position / 100) * 60
  const clampedPos = Math.min(Math.max(visualPos, 2), 98)

  // Delta
  const delta = test.previousValue != null ? test.value - test.previousValue : null
  const deltaAbs = delta != null ? Math.abs(delta) : 0

  // Context-aware delta color: for most labs, going up when high = bad
  const getDeltaColor = () => {
    if (delta == null || delta === 0) return 'text-slate-400'
    if (isHigh && delta > 0) return 'text-rose-500'
    if (isLow && delta < 0) return 'text-rose-500'
    if (isHigh && delta < 0) return 'text-emerald-500' // improving
    if (isLow && delta > 0) return 'text-emerald-500' // improving
    return 'text-slate-400'
  }

  const dotColor = isCritical
    ? 'bg-rose-500 ring-2 ring-rose-200'
    : isHigh || isLow
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  const valueColor = isCritical
    ? 'text-rose-600'
    : isHigh || isLow
      ? 'text-amber-600'
      : 'text-slate-700'

  const flagBadge = isCritical ? (
    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded">
      {flag === 'critical_high' ? 'CRIT H' : 'CRIT L'}
    </span>
  ) : (isHigh || isLow) ? (
    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded">
      {isHigh ? 'H' : 'L'}
    </span>
  ) : null

  return (
    <div className="group flex flex-col py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all duration-200 px-4">
      {/* Top: Name + Value */}
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-800 tracking-tight">{test.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{test.unit}</span>
        </div>

        <div className="flex items-center">
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className={clsx('text-lg font-bold tabular-nums tracking-tight', valueColor)}>
                {typeof test.value === 'number' ? test.value.toFixed(1).replace(/\.0$/, '') : test.value}
              </span>
              {flagBadge}
            </div>
            {delta != null && delta !== 0 && (
              <div className={clsx('flex items-center justify-end text-[10px] font-medium', getDeltaColor())}>
                {delta > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                <span className="ml-0.5">{deltaAbs < 0.1 ? deltaAbs.toFixed(2) : deltaAbs.toFixed(1)}</span>
              </div>
            )}
            {delta != null && delta === 0 && (
              <div className="flex items-center justify-end text-[10px] font-medium text-slate-400">
                <Minus size={10} />
                <span className="ml-0.5">0</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Reference Gauge */}
      <div className="relative h-1.5 w-full bg-slate-100 rounded-full mt-1 overflow-visible">
        {/* Normal range band */}
        <div
          className="absolute top-0 bottom-0 bg-slate-200/80 rounded-full"
          style={{ left: '20%', right: '20%' }}
        />

        {/* Value dot */}
        <div
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white shadow-sm transition-all duration-500',
            dotColor
          )}
          style={{ left: `calc(${clampedPos}% - 6px)` }}
        />

        {/* Ref labels on hover */}
        <div className="absolute -bottom-4 w-full flex justify-between text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="ml-[20%] -translate-x-1/2">{test.refLow}</span>
          <span className="mr-[20%] translate-x-1/2">{test.refHigh}</span>
        </div>
      </div>
    </div>
  )
}
