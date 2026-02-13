import { useState } from 'react'
import { clsx } from 'clsx'
import { BrainIcon } from '@/components/icons/MedicalIcons'
import { CalculatorShell } from './CalculatorShell'

interface GCSResult {
  total: number
  eye: number
  verbal: number
  motor: number
  interpretation: 'severe' | 'moderate' | 'mild'
  message: string
  color: string
}

function StepperButton({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-2">{label}</label>
      <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-600 rounded-lg p-3 min-h-[44px]">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">({min}−{max})</div>
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function GCSCalculator() {
  const [eye, setEye] = useState<number>(1)
  const [verbal, setVerbal] = useState<number>(1)
  const [motor, setMotor] = useState<number>(1)

  const calculateResult = (): GCSResult => {
    const total = eye + verbal + motor
    const eyeNum = eye
    const verbalNum = verbal
    const motorNum = motor

    if (total <= 8) {
      return {
        total,
        eye: eyeNum,
        verbal: verbalNum,
        motor: motorNum,
        interpretation: 'severe',
        message: 'Consider intubation for airway protection',
        color: 'from-red-900/20 to-red-900/10',
      }
    } else if (total <= 12) {
      return {
        total,
        eye: eyeNum,
        verbal: verbalNum,
        motor: motorNum,
        interpretation: 'moderate',
        message: 'Close monitoring required',
        color: 'from-amber-900/20 to-amber-900/10',
      }
    } else {
      return {
        total,
        eye: eyeNum,
        verbal: verbalNum,
        motor: motorNum,
        interpretation: 'mild',
        message: 'Mild impairment - observe for changes',
        color: 'from-green-900/20 to-green-900/10',
      }
    }
  }

  const result = calculateResult()

  return (
    <CalculatorShell
      title="Glasgow Coma Scale (GCS)"
      icon={<BrainIcon className="h-6 w-6" />}
      iconColor="text-purple-400"
      description="Assess level of consciousness"
    >
      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <StepperButton label="Eye Opening (E)" min={1} max={4} value={eye} onChange={setEye} />
        <StepperButton label="Verbal Response (V)" min={1} max={5} value={verbal} onChange={setVerbal} />
        <StepperButton label="Motor Response (M)" min={1} max={6} value={motor} onChange={setMotor} />
      </div>

      {/* Result */}
      <div
        className={clsx(
          'p-6 rounded-lg bg-gradient-to-br border border-slate-600',
          result.color,
          {
            'border-red-600/50': result.interpretation === 'severe',
            'border-amber-600/50': result.interpretation === 'moderate',
            'border-green-600/50': result.interpretation === 'mild',
          }
        )}
      >
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{result.eye}</div>
            <div className="text-xs text-slate-400">Eye</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{result.verbal}</div>
            <div className="text-xs text-slate-400">Verbal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{result.motor}</div>
            <div className="text-xs text-slate-400">Motor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-300">{result.total}</div>
            <div className="text-xs text-slate-400">/15</div>
          </div>
        </div>

        <div className="border-t border-slate-600/50 pt-4">
          <div className={clsx('text-sm font-semibold mb-1', {
            'text-red-300': result.interpretation === 'severe',
            'text-amber-300': result.interpretation === 'moderate',
            'text-green-300': result.interpretation === 'mild',
          })}>
            {result.interpretation === 'severe' && 'SEVERE (≤8)'}
            {result.interpretation === 'moderate' && 'MODERATE (9−12)'}
            {result.interpretation === 'mild' && 'MILD (13−15)'}
          </div>
          <div className="text-sm text-slate-300">{result.message}</div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-600/50">
          <div className="text-xs text-slate-400">
            GCS = E + V + M
          </div>
        </div>
      </div>
    </CalculatorShell>
  )
}
