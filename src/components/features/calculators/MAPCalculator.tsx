import { useState } from 'react'
import { clsx } from 'clsx'
import { BloodPressureIcon } from '@/components/icons/MedicalIcons'
import { CalculatorShell } from './CalculatorShell'

interface MAPResult {
  map: number
  interpretation: 'low' | 'normal' | 'elevated'
  message: string
  color: string
}

export function MAPCalculator() {
  const [sbp, setSbp] = useState<number | ''>('')
  const [dbp, setDbp] = useState<number | ''>('')

  const calculateResult = (): MAPResult | null => {
    if (sbp === '' || dbp === '') return null

    const sbpNum = Number(sbp)
    const dbpNum = Number(dbp)

    if (isNaN(sbpNum) || isNaN(dbpNum)) return null

    const map = (dbpNum * 2 + sbpNum) / 3

    if (map < 65) {
      return {
        map: Math.round(map * 10) / 10,
        interpretation: 'low',
        message: 'Consider vasopressors',
        color: 'from-red-900/20 to-red-900/10',
      }
    } else if (map <= 100) {
      return {
        map: Math.round(map * 10) / 10,
        interpretation: 'normal',
        message: 'Normal perfusion pressure',
        color: 'from-green-900/20 to-green-900/10',
      }
    } else {
      return {
        map: Math.round(map * 10) / 10,
        interpretation: 'elevated',
        message: 'Elevated perfusion pressure',
        color: 'from-amber-900/20 to-amber-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Mean Arterial Pressure (MAP)"
      icon={<BloodPressureIcon className="h-6 w-6" />}
      iconColor="text-red-400"
      description="Calculate MAP from systolic and diastolic blood pressure"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Systolic BP (mmHg)
          </label>
          <input
            type="number"
            value={sbp}
            onChange={(e) => setSbp(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Enter systolic BP"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Diastolic BP (mmHg)
          </label>
          <input
            type="number"
            value={dbp}
            onChange={(e) => setDbp(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Enter diastolic BP"
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
              'border-red-600/50': result.interpretation === 'low',
              'border-green-600/50': result.interpretation === 'normal',
              'border-amber-600/50': result.interpretation === 'elevated',
            }
          )}
        >
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-white mb-2">{result.map}</div>
            <div className="text-sm text-slate-300">mmHg</div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-red-300': result.interpretation === 'low',
              'text-green-300': result.interpretation === 'normal',
              'text-amber-300': result.interpretation === 'elevated',
            })}>
              {result.interpretation.toUpperCase()}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400">
              Formula: (DBP × 2 + SBP) / 3
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Enter blood pressure values to calculate MAP</p>
        </div>
      )}
    </CalculatorShell>
  )
}
