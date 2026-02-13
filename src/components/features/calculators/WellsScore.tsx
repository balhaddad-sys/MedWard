import { useState } from 'react'
import { clsx } from 'clsx'
import { BloodClotIcon } from '@/components/icons/MedicalIcons'
import { CalculatorShell } from './CalculatorShell'

interface WellsScoreResult {
  score: number
  interpretation: 'unlikely' | 'likely'
  message: string
  recommendation: string
  color: string
}

const CheckboxField = ({
  label,
  points,
  checked,
  onChange,
}: {
  label: string
  points: number
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
      </div>
      <div className={clsx('text-sm font-semibold flex-shrink-0', checked ? 'text-blue-400' : 'text-slate-500')}>
        +{points}
      </div>
    </div>
  </button>
)

export function WellsScore() {
  const [dvtSigns, setDvtSigns] = useState(false)
  const [peDiagnosis, setPeDiagnosis] = useState(false)
  const [heartRate, setHeartRate] = useState(false)
  const [immobilization, setImmobilization] = useState(false)
  const [previousDvepe, setPreviousDvepe] = useState(false)
  const [haemoptysis, setHaemoptysis] = useState(false)
  const [malignancy, setMalignancy] = useState(false)

  const calculateResult = (): WellsScoreResult => {
    const score =
      (dvtSigns ? 3 : 0) +
      (peDiagnosis ? 3 : 0) +
      (heartRate ? 1.5 : 0) +
      (immobilization ? 1.5 : 0) +
      (previousDvepe ? 1.5 : 0) +
      (haemoptysis ? 1 : 0) +
      (malignancy ? 1 : 0)

    if (score <= 4) {
      return {
        score: Math.round(score * 10) / 10,
        interpretation: 'unlikely',
        message: 'PE is unlikely',
        recommendation: 'Consider D-dimer testing to rule out PE',
        color: 'from-green-900/20 to-green-900/10',
      }
    } else {
      return {
        score: Math.round(score * 10) / 10,
        interpretation: 'likely',
        message: 'PE is likely',
        recommendation: 'Consider CTPA (CT pulmonary angiography) for confirmation',
        color: 'from-red-900/20 to-red-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Wells Score (Pulmonary embolism risk)"
      icon={<BloodClotIcon className="h-6 w-6" />}
      iconColor="text-blue-400"
      description="Predict probability of pulmonary embolism"
    >
      {/* Inputs */}
      <div className="space-y-3 mb-6">
        <CheckboxField
          label="Clinical signs of DVT (swelling, pain)"
          points={3}
          checked={dvtSigns}
          onChange={setDvtSigns}
        />
        <CheckboxField
          label="PE is #1 diagnosis or equally likely"
          points={3}
          checked={peDiagnosis}
          onChange={setPeDiagnosis}
        />
        <CheckboxField
          label="Heart rate > 100 bpm"
          points={1.5}
          checked={heartRate}
          onChange={setHeartRate}
        />
        <CheckboxField
          label="Immobilization ≥3 days or surgery in past 4 weeks"
          points={1.5}
          checked={immobilization}
          onChange={setImmobilization}
        />
        <CheckboxField
          label="Previous DVT or PE"
          points={1.5}
          checked={previousDvepe}
          onChange={setPreviousDvepe}
        />
        <CheckboxField
          label="Haemoptysis"
          points={1}
          checked={haemoptysis}
          onChange={setHaemoptysis}
        />
        <CheckboxField
          label="Malignancy"
          points={1}
          checked={malignancy}
          onChange={setMalignancy}
        />
      </div>

      {/* Result */}
      <div
        className={clsx(
          'p-6 rounded-lg bg-gradient-to-br border border-slate-600',
          result.color,
          {
            'border-green-600/50': result.interpretation === 'unlikely',
            'border-red-600/50': result.interpretation === 'likely',
          }
        )}
      >
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-white mb-2">{result.score}</div>
          <div className="text-sm text-slate-300">points</div>
        </div>

        <div className="border-t border-slate-600/50 pt-4">
          <div className={clsx('text-sm font-semibold mb-1', {
            'text-green-300': result.interpretation === 'unlikely',
            'text-red-300': result.interpretation === 'likely',
          })}>
            {result.interpretation === 'unlikely' && 'PE UNLIKELY (≤4)'}
            {result.interpretation === 'likely' && 'PE LIKELY (>4)'}
          </div>
          <div className="text-sm text-slate-300 mb-2">{result.message}</div>
          <div className="text-sm text-slate-200 font-medium">{result.recommendation}</div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-600/50">
          <div className="text-xs text-slate-400">
            7 clinical criteria weighted for PE risk stratification
          </div>
        </div>
      </div>
    </CalculatorShell>
  )
}
