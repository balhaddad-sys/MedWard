import { useState } from 'react'
import { clsx } from 'clsx'
import { Zap } from 'lucide-react'
import { CalculatorShell } from './CalculatorShell'

interface CURB65Result {
  score: number
  interpretation: 'low' | 'moderate' | 'severe'
  message: string
  mortalityPercent: number
  color: string
}

const MORTALITY_BY_SCORE: Record<number, number> = {
  0: 0.6,
  1: 2.7,
  2: 6.8,
  3: 14,
  4: 27,
  5: 57,
}

const CheckboxField = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={clsx(
      'w-full p-4 rounded-lg border-2 transition-all text-left min-h-[56px]',
      checked
        ? 'border-blue-500 bg-blue-900/20'
        : 'border-slate-600 bg-slate-900/30 hover:border-slate-500'
    )}
  >
    <div className="flex items-start gap-3">
      <div
        className={clsx(
          'mt-1 w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0',
          checked
            ? 'bg-blue-600 border-blue-600'
            : 'border-slate-500'
        )}
      >
        {checked && <div className="text-white text-sm font-bold">✓</div>}
      </div>
      <div className="flex-1">
        <div className="font-medium text-white">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
      </div>
    </div>
  </button>
)

export function CURB65Calculator() {
  const [confusion, setConfusion] = useState(false)
  const [urea, setUrea] = useState(false)
  const [respRate, setRespRate] = useState(false)
  const [bloodPressure, setBloodPressure] = useState(false)
  const [age, setAge] = useState(false)

  const calculateResult = (): CURB65Result | null => {
    const score = [confusion, urea, respRate, bloodPressure, age].filter(Boolean).length
    const mortality = MORTALITY_BY_SCORE[score] || 0

    if (score <= 1) {
      return {
        score,
        interpretation: 'low',
        message: 'Outpatient treatment likely appropriate',
        mortalityPercent: mortality,
        color: 'from-green-900/20 to-green-900/10',
      }
    } else if (score === 2) {
      return {
        score,
        interpretation: 'moderate',
        message: 'Short inpatient hospitalization',
        mortalityPercent: mortality,
        color: 'from-amber-900/20 to-amber-900/10',
      }
    } else {
      return {
        score,
        interpretation: 'severe',
        message: 'Consider ICU/HDU admission',
        mortalityPercent: mortality,
        color: 'from-red-900/20 to-red-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="CURB-65 Score (Pneumonia severity)"
      icon={<Zap className="h-6 w-6" />}
      iconColor="text-yellow-400"
      description="5-point community-acquired pneumonia risk stratification"
    >
      {/* Inputs */}
      <div className="space-y-3 mb-6">
        <CheckboxField
          label="Confusion"
          description="New confusion (AMT ≤8 or MMSE <9)"
          checked={confusion}
          onChange={setConfusion}
        />
        <CheckboxField
          label="Urea > 7 mmol/L"
          description="Elevated serum urea"
          checked={urea}
          onChange={setUrea}
        />
        <CheckboxField
          label="Respiratory Rate ≥ 30"
          description="Tachypnoea on presentation"
          checked={respRate}
          onChange={setRespRate}
        />
        <CheckboxField
          label="Blood Pressure"
          description="SBP < 90 mmHg or DBP ≤ 60 mmHg"
          checked={bloodPressure}
          onChange={setBloodPressure}
        />
        <CheckboxField
          label="Age ≥ 65 years"
          description="Elderly patients"
          checked={age}
          onChange={setAge}
        />
      </div>

      {/* Result */}
      {result && (
        <div
          className={clsx(
            'p-6 rounded-lg bg-gradient-to-br border border-slate-600',
            result.color,
            {
              'border-green-600/50': result.interpretation === 'low',
              'border-amber-600/50': result.interpretation === 'moderate',
              'border-red-600/50': result.interpretation === 'severe',
            }
          )}
        >
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{result.score}</div>
              <div className="text-sm text-slate-300">/5</div>
            </div>
            <div className="text-center border-l border-slate-600/50">
              <div className="text-3xl font-bold text-white mb-1">{result.mortalityPercent.toFixed(1)}%</div>
              <div className="text-sm text-slate-300">Mortality</div>
            </div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-green-300': result.interpretation === 'low',
              'text-amber-300': result.interpretation === 'moderate',
              'text-red-300': result.interpretation === 'severe',
            })}>
              {result.interpretation === 'low' && 'LOW RISK (0−1)'}
              {result.interpretation === 'moderate' && 'MODERATE RISK (2)'}
              {result.interpretation === 'severe' && 'SEVERE RISK (≥3)'}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400">
              Mortality rates: 0→0.6%, 1→2.7%, 2→6.8%, 3→14%, 4→27%, 5→57%
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Select criteria to calculate CURB-65 score</p>
        </div>
      )}
    </CalculatorShell>
  )
}
