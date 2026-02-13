import { useState } from 'react'
import { clsx } from 'clsx'
import { Beaker } from 'lucide-react'
import { CalculatorShell } from './CalculatorShell'

interface AnionGapResult {
  ag: number
  correctedAg?: number
  interpretation: 'normal' | 'elevated' | 'significantly_elevated'
  message: string
  color: string
}

export function AnionGapCalculator() {
  const [na, setNa] = useState<number | ''>('')
  const [cl, setCl] = useState<number | ''>('')
  const [hco3, setHco3] = useState<number | ''>('')
  const [albumin, setAlbumin] = useState<number | ''>('')

  const calculateResult = (): AnionGapResult | null => {
    if (na === '' || cl === '' || hco3 === '') return null

    const naNuM = Number(na)
    const clNum = Number(cl)
    const hco3Num = Number(hco3)

    if (isNaN(naNuM) || isNaN(clNum) || isNaN(hco3Num)) return null

    // AG = Na - (Cl + HCO3)
    const ag = naNuM - (clNum + hco3Num)

    let correctedAg: number | undefined
    if (albumin !== '') {
      const albNuM = Number(albumin)
      if (!isNaN(albNuM)) {
        // Corrected AG = AG + 2.5 * (4.0 - Albumin/10)
        correctedAg = ag + 2.5 * (4.0 - albNuM / 10)
      }
    }

    const checkValue = correctedAg !== undefined ? correctedAg : ag

    if (checkValue < 8 || checkValue > 12) {
      if (checkValue > 20) {
        return {
          ag: Math.round(ag * 10) / 10,
          correctedAg: correctedAg !== undefined ? Math.round(correctedAg * 10) / 10 : undefined,
          interpretation: 'significantly_elevated',
          message: 'Significantly elevated - consider MUDPILES (metabolic acidosis with gap)',
          color: 'from-red-900/20 to-red-900/10',
        }
      } else if (checkValue > 12) {
        return {
          ag: Math.round(ag * 10) / 10,
          correctedAg: correctedAg !== undefined ? Math.round(correctedAg * 10) / 10 : undefined,
          interpretation: 'elevated',
          message: 'Elevated anion gap - consider MUDPILES',
          color: 'from-amber-900/20 to-amber-900/10',
        }
      } else {
        return {
          ag: Math.round(ag * 10) / 10,
          correctedAg: correctedAg !== undefined ? Math.round(correctedAg * 10) / 10 : undefined,
          interpretation: 'normal',
          message: 'Normal anion gap',
          color: 'from-green-900/20 to-green-900/10',
        }
      }
    } else {
      return {
        ag: Math.round(ag * 10) / 10,
        correctedAg: correctedAg !== undefined ? Math.round(correctedAg * 10) / 10 : undefined,
        interpretation: 'normal',
        message: 'Normal anion gap',
        color: 'from-green-900/20 to-green-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Anion Gap Calculator"
      icon={<Beaker className="h-6 w-6" />}
      iconColor="text-emerald-400"
      description="Calculate anion gap from electrolytes (and corrected AG if albumin provided)"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Sodium (Na⁺) mmol/L
          </label>
          <input
            type="number"
            value={na}
            onChange={(e) => setNa(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="135–145 (normal)"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Chloride (Cl⁻) mmol/L
          </label>
          <input
            type="number"
            value={cl}
            onChange={(e) => setCl(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="98–107 (normal)"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Bicarbonate (HCO₃⁻) mmol/L
          </label>
          <input
            type="number"
            value={hco3}
            onChange={(e) => setHco3(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="22–26 (normal)"
            className={clsx(
              'w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg',
              'text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
              'min-h-[44px]'
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Serum Albumin (g/L) <span className="text-slate-400">optional</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={albumin}
            onChange={(e) => setAlbumin(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="35–50 (normal) - for corrected AG"
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
              'border-amber-600/50': result.interpretation === 'elevated',
              'border-red-600/50': result.interpretation === 'significantly_elevated',
            }
          )}
        >
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{result.ag}</div>
              <div className="text-sm text-slate-300">Anion Gap</div>
            </div>
            {result.correctedAg !== undefined && (
              <div className="text-center border-l border-slate-600/50">
                <div className="text-4xl font-bold text-blue-300 mb-1">{result.correctedAg}</div>
                <div className="text-sm text-slate-300">Corrected AG</div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-green-300': result.interpretation === 'normal',
              'text-amber-300': result.interpretation === 'elevated',
              'text-red-300': result.interpretation === 'significantly_elevated',
            })}>
              {result.interpretation === 'normal' && 'NORMAL (8−12)'}
              {result.interpretation === 'elevated' && 'ELEVATED (12−20)'}
              {result.interpretation === 'significantly_elevated' && 'SIGNIFICANTLY ELEVATED (>20)'}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-1">
            <div className="text-xs text-slate-400">
              Formula: AG = Na − (Cl + HCO₃)
            </div>
            {albumin !== '' && (
              <div className="text-xs text-slate-400">
                Corrected: AG + 2.5 × (4.0 − Albumin/10)
              </div>
            )}
            <div className="text-xs text-slate-400 mt-2">
              MUDPILES: Methanol, Uremia, Diabetic ketoacidosis, Propylene glycol, Isoniazid, Lactic acidosis, Ethylene glycol, Salicylates
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Enter Na⁺, Cl⁻, and HCO₃⁻ to calculate anion gap</p>
        </div>
      )}
    </CalculatorShell>
  )
}
