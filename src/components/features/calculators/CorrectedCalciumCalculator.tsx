import { useState } from 'react'
import { clsx } from 'clsx'
import { FlaskIcon } from '@/components/icons/MedicalIcons'
import { CalculatorShell } from './CalculatorShell'

interface CorrectedCalciumResult {
  correctedCa: number
  interpretation: 'hypocalcaemia' | 'normal' | 'hypercalcaemia'
  message: string
  color: string
}

export function CorrectedCalciumCalculator() {
  const [totalCa, setTotalCa] = useState<number | ''>('')
  const [albumin, setAlbumin] = useState<number | ''>('')

  const calculateResult = (): CorrectedCalciumResult | null => {
    if (totalCa === '' || albumin === '') return null

    const caNuM = Number(totalCa)
    const albNuM = Number(albumin)

    if (isNaN(caNuM) || isNaN(albNuM)) return null

    // Payne formula: Corrected Ca = Total Ca + 0.02 * (40 - Albumin)
    const correctedCa = caNuM + 0.02 * (40 - albNuM)

    if (correctedCa < 2.1) {
      return {
        correctedCa: Math.round(correctedCa * 100) / 100,
        interpretation: 'hypocalcaemia',
        message: 'Low serum calcium - monitor and consider supplementation',
        color: 'from-amber-900/20 to-amber-900/10',
      }
    } else if (correctedCa > 2.65) {
      return {
        correctedCa: Math.round(correctedCa * 100) / 100,
        interpretation: 'hypercalcaemia',
        message: 'High serum calcium - investigate cause and manage',
        color: 'from-red-900/20 to-red-900/10',
      }
    } else {
      return {
        correctedCa: Math.round(correctedCa * 100) / 100,
        interpretation: 'normal',
        message: 'Normal serum calcium',
        color: 'from-green-900/20 to-green-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Corrected Serum Calcium"
      icon={<FlaskIcon className="h-6 w-6" />}
      iconColor="text-cyan-400"
      description="Adjust total calcium for albumin levels (Payne formula)"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Total Serum Calcium (mmol/L)
          </label>
          <input
            type="number"
            step="0.01"
            value={totalCa}
            onChange={(e) => setTotalCa(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="2.2–2.7 (normal)"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Serum Albumin (g/L)
          </label>
          <input
            type="number"
            step="0.1"
            value={albumin}
            onChange={(e) => setAlbumin(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="35–50 (normal)"
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
              'border-amber-600/50': result.interpretation === 'hypocalcaemia',
              'border-green-600/50': result.interpretation === 'normal',
              'border-red-600/50': result.interpretation === 'hypercalcaemia',
            }
          )}
        >
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-white mb-2">{result.correctedCa}</div>
            <div className="text-sm text-slate-300">mmol/L</div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-amber-300': result.interpretation === 'hypocalcaemia',
              'text-green-300': result.interpretation === 'normal',
              'text-red-300': result.interpretation === 'hypercalcaemia',
            })}>
              {result.interpretation === 'hypocalcaemia' && 'HYPOCALCAEMIA (<2.1)'}
              {result.interpretation === 'normal' && 'NORMAL (2.1−2.65)'}
              {result.interpretation === 'hypercalcaemia' && 'HYPERCALCAEMIA (>2.65)'}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400">
              Formula: Corrected Ca = Total Ca + 0.02 × (40 − Albumin)
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Enter calcium and albumin values to calculate corrected calcium</p>
        </div>
      )}
    </CalculatorShell>
  )
}
