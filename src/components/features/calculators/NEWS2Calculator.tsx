import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertCircle } from 'lucide-react'
import { CalculatorShell } from './CalculatorShell'

interface NEWS2Result {
  total: number
  interpretation: 'baseline' | 'low' | 'medium' | 'high'
  message: string
  color: string
}

const ScoreButton = ({
  label,
  value,
  selected,
  onClick,
}: {
  label: string
  value: number
  selected: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all min-h-[44px]',
      selected
        ? 'bg-blue-600 text-white border border-blue-500'
        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
    )}
  >
    <div className="text-sm">{label}</div>
    <div className={clsx('text-xs mt-1', selected ? 'text-blue-100' : 'text-slate-400')}>
      ({value} pts)
    </div>
  </button>
)

export function NEWS2Calculator() {
  const [respRate, setRespRate] = useState<number | null>(null)
  const [spo2Scale1, setSpo2Scale1] = useState<number | null>(null)
  const [airO2, setAirO2] = useState<number | null>(null)
  const [sysBP, setSysBP] = useState<number | null>(null)
  const [pulse, setPulse] = useState<number | null>(null)
  const [consciousness, setConsciousness] = useState<number | null>(null)
  const [temperature, setTemperature] = useState<number | null>(null)

  const calculateResult = (): NEWS2Result | null => {
    if (
      respRate === null ||
      spo2Scale1 === null ||
      airO2 === null ||
      sysBP === null ||
      pulse === null ||
      consciousness === null ||
      temperature === null
    ) {
      return null
    }

    const total = respRate + spo2Scale1 + airO2 + sysBP + pulse + consciousness + temperature

    if (total === 0) {
      return {
        total,
        interpretation: 'baseline',
        message: 'Baseline observations - standard protocol',
        color: 'from-green-900/20 to-green-900/10',
      }
    } else if (total <= 4) {
      return {
        total,
        interpretation: 'low',
        message: 'Low risk - routine observations',
        color: 'from-yellow-900/20 to-yellow-900/10',
      }
    } else if (total <= 6) {
      return {
        total,
        interpretation: 'medium',
        message: 'Urgent ward response required',
        color: 'from-amber-900/20 to-amber-900/10',
      }
    } else {
      return {
        total,
        interpretation: 'high',
        message: 'Urgent/emergency response required',
        color: 'from-red-900/20 to-red-900/10',
      }
    }
  }

  const result = calculateResult()

  const ScoreSection = ({
    title,
    options,
    value,
    onChange,
  }: {
    title: string
    options: Array<{ label: string; value: number }>
    value: number | null
    onChange: (v: number) => void
  }) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => (
          <ScoreButton
            key={opt.value}
            label={opt.label}
            value={opt.value}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <CalculatorShell
      title="NEWS2 Score (National Early Warning Score)"
      icon={<AlertCircle className="h-6 w-6" />}
      iconColor="text-orange-400"
      description="Calculate 7-parameter clinical deterioration score"
    >
      {/* Inputs */}
      <div className="space-y-6 mb-6">
        <ScoreSection
          title="Respiratory Rate"
          options={[
            { label: '12−20', value: 0 },
            { label: '21−24', value: 1 },
            { label: '9−11', value: 2 },
            { label: '≤8 or ≥25', value: 3 },
          ]}
          value={respRate}
          onChange={setRespRate}
        />

        <ScoreSection
          title="SpO₂ (Scale 1)"
          options={[
            { label: '≥96', value: 0 },
            { label: '94−95', value: 1 },
            { label: '92−93', value: 2 },
            { label: '≤91', value: 3 },
          ]}
          value={spo2Scale1}
          onChange={setSpo2Scale1}
        />

        <ScoreSection
          title="Oxygen Administration"
          options={[
            { label: 'Air', value: 0 },
            { label: 'Supplemental O₂', value: 2 },
          ]}
          value={airO2}
          onChange={setAirO2}
        />

        <ScoreSection
          title="Systolic BP (mmHg)"
          options={[
            { label: '111−219', value: 0 },
            { label: '101−110', value: 1 },
            { label: '91−100', value: 2 },
            { label: '≤90 or ≥220', value: 3 },
          ]}
          value={sysBP}
          onChange={setSysBP}
        />

        <ScoreSection
          title="Pulse (bpm)"
          options={[
            { label: '51−90', value: 0 },
            { label: '91−110', value: 1 },
            { label: '41−50', value: 2 },
            { label: '≤40 or ≥131', value: 3 },
          ]}
          value={pulse}
          onChange={setPulse}
        />

        <ScoreSection
          title="Level of Consciousness"
          options={[
            { label: 'Alert', value: 0 },
            { label: 'CVPU', value: 3 },
          ]}
          value={consciousness}
          onChange={setConsciousness}
        />

        <ScoreSection
          title="Temperature (°C)"
          options={[
            { label: '36.1−38', value: 0 },
            { label: '35.1−36 or 38.1−39', value: 1 },
            { label: '≤35', value: 2 },
            { label: '≥39.1', value: 3 },
          ]}
          value={temperature}
          onChange={setTemperature}
        />
      </div>

      {/* Result */}
      {result && (
        <div
          className={clsx(
            'p-6 rounded-lg bg-gradient-to-br border border-slate-600',
            result.color,
            {
              'border-green-600/50': result.interpretation === 'baseline',
              'border-yellow-600/50': result.interpretation === 'low',
              'border-amber-600/50': result.interpretation === 'medium',
              'border-red-600/50': result.interpretation === 'high',
            }
          )}
        >
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-white mb-2">{result.total}</div>
            <div className="text-sm text-slate-300">/20</div>
          </div>

          <div className="border-t border-slate-600/50 pt-4">
            <div className={clsx('text-sm font-semibold mb-1', {
              'text-green-300': result.interpretation === 'baseline',
              'text-yellow-300': result.interpretation === 'low',
              'text-amber-300': result.interpretation === 'medium',
              'text-red-300': result.interpretation === 'high',
            })}>
              {result.interpretation === 'baseline' && 'BASELINE'}
              {result.interpretation === 'low' && 'LOW RISK (1−4)'}
              {result.interpretation === 'medium' && 'MEDIUM RISK (5−6)'}
              {result.interpretation === 'high' && 'HIGH RISK (≥7)'}
            </div>
            <div className="text-sm text-slate-300">{result.message}</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="p-6 rounded-lg bg-slate-900/30 border border-slate-600/50 text-center">
          <p className="text-sm text-slate-400">Select all 7 parameters to calculate NEWS2 score</p>
        </div>
      )}
    </CalculatorShell>
  )
}
