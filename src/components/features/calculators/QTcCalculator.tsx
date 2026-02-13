import { useState } from 'react'
import { clsx } from 'clsx'
import { Activity } from 'lucide-react'
import { CalculatorShell } from './CalculatorShell'

interface QTcResult {
  qtc: number
  interpretation: 'normal' | 'borderline' | 'prolonged'
  message: string
  color: string
}

export function QTcCalculator() {
  const [qt, setQt] = useState<number | ''>('')
  const [hr, setHr] = useState<number | ''>('')

  const calculateResult = (): QTcResult | null => {
    if (qt === '' || hr === '') return null

    const qtNum = Number(qt)
    const hrNum = Number(hr)

    if (isNaN(qtNum) || isNaN(hrNum) || hrNum <= 0) return null

    // Bazett formula: QTc = QT / sqrt(60/HR)
    const rr = 60 / hrNum
    const qtc = qtNum / Math.sqrt(rr)

    if (qtc > 500) {
      return {
        qtc: Math.round(qtc),
        interpretation: 'prolonged',
        message: 'High risk - review QT-prolonging drugs (antiarrhythmics, antiemetics, antipsychotics)',
        color: 'from-red-900/20 to-red-900/10',
      }
    } else if (qtc > 450) {
      return {
        qtc: Math.round(qtc),
        interpretation: 'borderline',
        message: 'Borderline - monitor closely for QT-prolonging medications',
        color: 'from-amber-900/20 to-amber-900/10',
      }
    } else {
      return {
        qtc: Math.round(qtc),
        interpretation: 'normal',
        message: 'Normal - low risk of torsades de pointes',
        color: 'from-green-900/20 to-green-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Corrected QT Interval (QTc)"
      icon={<Activity className="h-6 w-6" />}
      iconColor="text-pink-400"
      description="Calculate QTc using Bazett formula (Bazett's correction)"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            QT Interval (ms)
          </label>
          <input
            type="number"
            value={qt}
            onChange={(e) => setQt(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Typical: 300–450"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            value={hr}
            onChange={(e) => setHr(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g., 72"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={clsx(
            'p-6 rounded-lg bg-gradient-to-br border border-slate-600',
            result.color,
            {
              'border-green-600/50': result.interpretation === 'normal',
              'border-amber-600/50': result.interpretation === 'borderline',
              'border-red-600/50': result.interpretation === 'prolonged',
            }
          )}
        >
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-white mb-2">{result.qtc}</div>
            <div className="text-sm text-slate-300">ms</div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-green-300': result.interpretation === 'normal',
              'text-amber-300': result.interpretation === 'borderline',
              'text-red-300': result.interpretation === 'prolonged',
            })}>
              {result.interpretation === 'normal' && 'NORMAL (≤450)'}
              {result.interpretation === 'borderline' && 'BORDERLINE (451−500)'}
              {result.interpretation === 'prolonged' && 'PROLONGED (>500)'}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400">
              Bazett: QTc = QT / √(60/HR)
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Enter QT interval and heart rate to calculate QTc</p>
        </div>
      )}
    </CalculatorShell>
  )
}
