import { useState } from 'react'
import { clsx } from 'clsx'
import { HeartRhythmIcon } from '@/components/icons/MedicalIcons'
import { CalculatorShell } from './CalculatorShell'

interface CHA2DS2VASc_Result {
  score: number
  interpretation: 'low' | 'moderate' | 'high'
  recommendation: string
  annualStrokeRisk: number
  color: string
}

const STROKE_RISK_BY_SCORE: Record<number, number> = {
  0: 0,
  1: 1.3,
  2: 2.2,
  3: 3.2,
  4: 4.0,
  5: 6.7,
  6: 9.8,
  7: 9.6,
  8: 12.5,
  9: 15.2,
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

const SegmentedControl = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ label: string; value: number }>
  value: number | null
  onChange: (v: number) => void
}) => (
  <div>
    <div className="block text-sm font-medium text-slate-200 mb-2">{label}</div>
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-3 py-2 rounded-lg font-medium text-sm transition-all min-h-[44px]',
            value === opt.value
              ? 'bg-blue-600 text-white border border-blue-500'
              : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
          )}
        >
          <div>{opt.label}</div>
          <div className={clsx('text-xs mt-1', value === opt.value ? 'text-blue-100' : 'text-slate-400')}>
            +{opt.value}
          </div>
        </button>
      ))}
    </div>
  </div>
)

const SexControl = ({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string) => void
}) => (
  <div>
    <div className="block text-sm font-medium text-slate-200 mb-2">Sex</div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'Male', value: 'male', points: 0 },
        { label: 'Female', value: 'female', points: 1 },
      ].map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-3 py-2 rounded-lg font-medium text-sm transition-all min-h-[44px]',
            value === opt.value
              ? 'bg-blue-600 text-white border border-blue-500'
              : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
          )}
        >
          <div>{opt.label}</div>
          <div className={clsx('text-xs mt-1', value === opt.value ? 'text-blue-100' : 'text-slate-400')}>
            +{opt.points}
          </div>
        </button>
      ))}
    </div>
  </div>
)

export function CHA2DS2VASc() {
  const [chf, setChf] = useState(false)
  const [hypertension, setHypertension] = useState(false)
  const [ageGroup, setAgeGroup] = useState<number | null>(null)
  const [diabetes, setDiabetes] = useState(false)
  const [stroke, setStroke] = useState(false)
  const [vascular, setVascular] = useState(false)
  const [sex, setSex] = useState<string | null>(null)

  const calculateResult = (): CHA2DS2VASc_Result | null => {
    if (ageGroup === null || sex === null) return null

    const score =
      (chf ? 1 : 0) +
      (hypertension ? 1 : 0) +
      ageGroup +
      (diabetes ? 1 : 0) +
      (stroke ? 2 : 0) +
      (vascular ? 1 : 0) +
      (sex === 'female' ? 1 : 0)

    const strokeRisk = STROKE_RISK_BY_SCORE[score] || 0

    let interpretation: 'low' | 'moderate' | 'high'
    let recommendation: string

    if (sex === 'male' && score === 0) {
      interpretation = 'low'
      recommendation = 'No anticoagulation required'
    } else if (sex === 'female' && score === 1) {
      interpretation = 'low'
      recommendation = 'No anticoagulation required'
    } else if (sex === 'male' && score === 1) {
      interpretation = 'moderate'
      recommendation = 'Consider anticoagulation'
    } else if (score >= 2) {
      interpretation = 'high'
      recommendation = 'Anticoagulation strongly recommended'
    } else {
      interpretation = 'low'
      recommendation = 'Consider anticoagulation'
    }

    return {
      score,
      interpretation,
      recommendation,
      annualStrokeRisk: strokeRisk,
      color:
        interpretation === 'low'
          ? 'from-green-900/20 to-green-900/10'
          : interpretation === 'moderate'
            ? 'from-amber-900/20 to-amber-900/10'
            : 'from-red-900/20 to-red-900/10',
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="CHA₂DS₂-VASc Score (Atrial fibrillation stroke risk)"
      icon={<HeartRhythmIcon className="h-6 w-6" />}
      iconColor="text-red-400"
      description="Assess anticoagulation need in atrial fibrillation"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <CheckboxField
          label="Congestive Heart Failure"
          points={1}
          checked={chf}
          onChange={setChf}
        />
        <CheckboxField
          label="Hypertension"
          points={1}
          checked={hypertension}
          onChange={setHypertension}
        />

        <SegmentedControl
          label="Age"
          options={[
            { label: '<65', value: 0 },
            { label: '65−74', value: 1 },
            { label: '≥75', value: 2 },
          ]}
          value={ageGroup}
          onChange={setAgeGroup}
        />

        <CheckboxField
          label="Diabetes"
          points={1}
          checked={diabetes}
          onChange={setDiabetes}
        />

        <CheckboxField
          label="Stroke/TIA/Thromboembolism"
          points={2}
          checked={stroke}
          onChange={setStroke}
        />

        <CheckboxField
          label="Vascular Disease"
          points={1}
          checked={vascular}
          onChange={setVascular}
        />

        <SexControl value={sex} onChange={setSex} />
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
              'border-red-600/50': result.interpretation === 'high',
            }
          )}
        >
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{result.score}</div>
              <div className="text-sm text-slate-300">/9</div>
            </div>
            <div className="text-center border-l border-slate-600/50">
              <div className="text-3xl font-bold text-white mb-1">{result.annualStrokeRisk.toFixed(1)}%</div>
              <div className="text-sm text-slate-300">Annual Stroke Risk</div>
            </div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-green-300': result.interpretation === 'low',
              'text-amber-300': result.interpretation === 'moderate',
              'text-red-300': result.interpretation === 'high',
            })}>
              {result.interpretation === 'low' && 'LOW RISK'}
              {result.interpretation === 'moderate' && 'MODERATE RISK'}
              {result.interpretation === 'high' && 'HIGH RISK'}
            </div>
            <div className="text-sm text-slate-300">{result.recommendation}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400">
              Stroke risk rates by score: 0→0%, 1→1.3%, 2→2.2%, 3→3.2%, 4→4.0%, 5→6.7%, 6→9.8%, 7→9.6%, 8→12.5%, 9→15.2%
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Select age and sex to calculate CHA₂DS₂-VASc score</p>
        </div>
      )}
    </CalculatorShell>
  )
}
