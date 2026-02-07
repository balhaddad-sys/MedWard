import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Activity,
  Clock,
  Phone,
  Calculator,
  Heart,
  Thermometer,
  Droplets,
  Brain,
  Timer,
  PhoneCall,
  ClipboardList,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { triggerHaptic, hapticPatterns } from '@/utils/haptics'

interface AcuteTimer {
  id: string
  label: string
  targetMs: number
  startedAt: number | null
  isRunning: boolean
  elapsed: number
}

export default function AcuteRoot() {
  const patients = usePatientStore((s) => s.patients)
  const navigate = useNavigate()
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [activeSection, setActiveSection] = useState<'vitals' | 'tools' | 'timers' | 'escalation'>('vitals')

  const criticalPatients = patients.filter((p) => p.acuity <= 2)
  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  // Timers
  const [timers, setTimers] = useState<AcuteTimer[]>([
    { id: 'abx', label: 'Antibiotics Due', targetMs: 60 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
    { id: 'reassess', label: 'Reassessment', targetMs: 30 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
    { id: 'transfer', label: 'Transfer / ICU', targetMs: 4 * 60 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
  ])

  // Timer tick
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || !t.startedAt) return t
          return { ...t, elapsed: Date.now() - t.startedAt }
        })
      )
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const toggleTimer = useCallback((id: string) => {
    triggerHaptic('tap')
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (t.isRunning) {
          return { ...t, isRunning: false }
        }
        return { ...t, isRunning: true, startedAt: Date.now() - t.elapsed }
      })
    )
  }, [])

  const resetTimer = useCallback((id: string) => {
    triggerHaptic('tap')
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: false, startedAt: null, elapsed: 0 } : t))
    )
  }, [])

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Calculator states
  const [mapSystolic, setMapSystolic] = useState('')
  const [mapDiastolic, setMapDiastolic] = useState('')
  const [gcsEye, setGcsEye] = useState(4)
  const [gcsVerbal, setGcsVerbal] = useState(5)
  const [gcsMotor, setGcsMotor] = useState(6)

  const mapResult =
    mapSystolic && mapDiastolic
      ? Math.round((parseInt(mapDiastolic) * 2 + parseInt(mapSystolic)) / 3)
      : null

  const gcsTotal = gcsEye + gcsVerbal + gcsMotor

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Red Flags Header */}
      {criticalPatients.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-600/20 border border-red-600/40">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-bold text-red-400">
            {criticalPatients.length} CRITICAL PATIENT{criticalPatients.length > 1 ? 'S' : ''}
          </span>
        </div>
      )}

      {/* Patient Selector (if needed) */}
      <div className="flex items-center gap-2">
        <select
          className="flex-1 bg-slate-700/40 text-white border border-slate-600 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent"
          value={selectedPatientId}
          onChange={(e) => {
            triggerHaptic('tap')
            setSelectedPatientId(e.target.value)
          }}
        >
          <option value="">Select patient...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.acuity <= 2 ? '!!! ' : ''}Bed {p.bedNumber} — {p.lastName}, {p.firstName} — {p.primaryDiagnosis}
            </option>
          ))}
        </select>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-slate-700/40 rounded-lg p-1">
        {[
          { id: 'vitals' as const, label: 'Vitals', Icon: Activity },
          { id: 'tools' as const, label: 'Tools', Icon: Calculator },
          { id: 'timers' as const, label: 'Timers', Icon: Timer },
          { id: 'escalation' as const, label: 'Escalate', Icon: PhoneCall },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('tap')
              setActiveSection(tab.id)
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors touch',
              activeSection === tab.id
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            )}
          >
            <tab.Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* VITALS SECTION */}
      {activeSection === 'vitals' && (
        <div className="space-y-4">
          {!selectedPatientId ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Select a patient to view vitals</p>
            </div>
          ) : (
            <>
              {/* Vitals Grid - Large numbers for glanceability */}
              <div className="grid grid-cols-2 gap-2">
                <VitalCard icon={Heart} label="HR" value="--" unit="bpm" color="red" />
                <VitalCard icon={Activity} label="BP" value="--/--" unit="mmHg" color="blue" />
                <VitalCard icon={Droplets} label="SpO2" value="--" unit="%" color="cyan" />
                <VitalCard icon={Thermometer} label="Temp" value="--" unit="C" color="amber" />
                <VitalCard icon={Activity} label="RR" value="--" unit="/min" color="green" />
                <VitalCard icon={Brain} label="GCS" value="--" unit="/15" color="purple" />
              </div>

              <p className="text-xs text-slate-500 text-center italic">
                Vitals data requires real-time Firestore integration
              </p>
            </>
          )}
        </div>
      )}

      {/* TOOLS SECTION */}
      {activeSection === 'tools' && (
        <div className="space-y-4">
          {/* MAP Calculator */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-400" />
              MAP Calculator
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                placeholder="SBP"
                value={mapSystolic}
                onChange={(e) => setMapSystolic(e.target.value)}
                className="flex-1 bg-slate-800/60 text-white border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 font-bold">/</span>
              <input
                type="number"
                placeholder="DBP"
                value={mapDiastolic}
                onChange={(e) => setMapDiastolic(e.target.value)}
                className="flex-1 bg-slate-800/60 text-white border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {mapResult !== null && (
              <div className="text-center">
                <span className="text-3xl font-bold text-blue-400 font-mono">
                  MAP: {mapResult}
                </span>
                <span className="text-sm text-slate-400 ml-2">mmHg</span>
                {mapResult < 65 && (
                  <p className="text-red-400 text-xs mt-1 font-bold">
                    LOW — Consider vasopressors
                  </p>
                )}
              </div>
            )}
          </div>

          {/* GCS Calculator */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              GCS Calculator
            </h3>
            <div className="space-y-3">
              <GCSInput label="Eye" value={gcsEye} min={1} max={4} onChange={setGcsEye} />
              <GCSInput label="Verbal" value={gcsVerbal} min={1} max={5} onChange={setGcsVerbal} />
              <GCSInput label="Motor" value={gcsMotor} min={1} max={6} onChange={setGcsMotor} />
            </div>
            <div className="text-center mt-3 pt-3 border-t border-slate-600">
              <span
                className={clsx(
                  'text-3xl font-bold font-mono',
                  gcsTotal <= 8
                    ? 'text-red-400'
                    : gcsTotal <= 12
                      ? 'text-amber-400'
                      : 'text-green-400'
                )}
              >
                GCS: {gcsTotal}
              </span>
              <span className="text-sm text-slate-400 ml-2">/15</span>
              {gcsTotal <= 8 && (
                <p className="text-red-400 text-xs mt-1 font-bold">
                  SEVERE — Consider intubation
                </p>
              )}
            </div>
          </div>

          {/* Quick Tools Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'qSOFA', desc: 'Sepsis screening', color: 'red' },
              { label: 'Fluid Bolus', desc: 'Calculate volume', color: 'blue' },
              { label: 'WELLS Score', desc: 'PE probability', color: 'amber' },
              { label: 'CURB-65', desc: 'Pneumonia severity', color: 'green' },
            ].map((tool) => (
              <button
                key={tool.label}
                onClick={() => triggerHaptic('tap')}
                className="bg-slate-700/40 border border-slate-600 rounded-xl p-4 text-left hover:bg-slate-750 transition-colors touch"
              >
                <p className="text-sm font-bold text-white">{tool.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TIMERS SECTION */}
      {activeSection === 'timers' && (
        <div className="space-y-3">
          {timers.map((timer) => {
            const remaining = Math.max(0, timer.targetMs - timer.elapsed)
            const progress = Math.min(1, timer.elapsed / timer.targetMs)
            const isOverdue = timer.elapsed >= timer.targetMs && timer.isRunning

            return (
              <div
                key={timer.id}
                className={clsx(
                  'bg-slate-700/40 rounded-xl p-4 border transition-colors',
                  isOverdue
                    ? 'border-red-500 animate-pulse'
                    : timer.isRunning
                      ? 'border-amber-500/50'
                      : 'border-slate-600'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {timer.label}
                  </span>
                  {isOverdue && (
                    <span className="text-xs font-bold text-red-400 animate-pulse">
                      OVERDUE
                    </span>
                  )}
                </div>

                <div className="text-center mb-3">
                  <span
                    className={clsx(
                      'text-4xl font-bold font-mono',
                      isOverdue ? 'text-red-400' : timer.isRunning ? 'text-amber-400' : 'text-slate-300'
                    )}
                  >
                    {timer.isRunning ? formatTime(remaining) : formatTime(timer.targetMs)}
                  </span>
                </div>

                {/* Progress bar */}
                {timer.isRunning && (
                  <div className="w-full h-1.5 bg-slate-600/60 rounded-full mb-3 overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        isOverdue ? 'bg-red-500' : progress > 0.75 ? 'bg-amber-500' : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min(100, progress * 100)}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTimer(timer.id)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors touch min-h-[48px]',
                      timer.isRunning
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    )}
                  >
                    {timer.isRunning ? (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => resetTimer(timer.id)}
                    className="p-2.5 rounded-lg bg-slate-600/60 text-slate-300 hover:bg-slate-600 transition-colors touch min-h-[48px] min-w-[48px] flex items-center justify-center"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ESCALATION SECTION */}
      {activeSection === 'escalation' && (
        <div className="space-y-4">
          {/* One-tap call buttons */}
          <div className="space-y-2">
            {[
              { label: 'Call Senior / Registrar', color: 'bg-amber-600', icon: Phone },
              { label: 'Call ICU / Outreach', color: 'bg-red-600', icon: PhoneCall },
              { label: 'Call MET / Code Blue', color: 'bg-red-700', icon: AlertTriangle },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => hapticPatterns.escalation()}
                className={clsx(
                  action.color,
                  'w-full flex items-center justify-center gap-3 py-4 rounded-xl text-white font-bold text-sm uppercase tracking-wider transition-opacity hover:opacity-90 touch min-h-[56px]'
                )}
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </button>
            ))}
          </div>

          {/* SBAR Generator */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-400" />
              Quick SBAR
            </h3>
            {selectedPatient ? (
              <div className="space-y-2 text-sm">
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <span className="text-red-400 font-bold text-xs uppercase">S — Situation</span>
                  <p className="text-slate-300 mt-1">
                    Calling about {selectedPatient.firstName} {selectedPatient.lastName}, Bed{' '}
                    {selectedPatient.bedNumber}, admitted with {selectedPatient.primaryDiagnosis}
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <span className="text-amber-400 font-bold text-xs uppercase">B — Background</span>
                  <p className="text-slate-300 mt-1">
                    Acuity: {selectedPatient.acuity}/5. Allergies:{' '}
                    {selectedPatient.allergies?.length
                      ? selectedPatient.allergies.join(', ')
                      : 'NKDA'}
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <span className="text-blue-400 font-bold text-xs uppercase">A — Assessment</span>
                  <p className="text-slate-400 mt-1 italic">Enter current clinical concern...</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <span className="text-green-400 font-bold text-xs uppercase">R — Recommendation</span>
                  <p className="text-slate-400 mt-1 italic">Enter requested action...</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">
                Select a patient above to generate SBAR
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    red: 'text-red-400 bg-red-500/10 border-red-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  }

  return (
    <div className={clsx('rounded-xl p-4 border', colorMap[color] || colorMap.blue)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-4 w-4 opacity-70" />
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold font-mono">{value}</span>
        <span className="text-xs opacity-50">{unit}</span>
      </div>
    </div>
  )
}

function GCSInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300 font-medium w-16">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value > min) onChange(value - 1)
          }}
          className="h-10 w-10 rounded-lg bg-slate-600/60 flex items-center justify-center text-white hover:bg-slate-600 touch"
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-xl font-bold text-white font-mono w-8 text-center">{value}</span>
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value < max) onChange(value + 1)
          }}
          className="h-10 w-10 rounded-lg bg-slate-600/60 flex items-center justify-center text-white hover:bg-slate-600 touch"
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <span className="text-xs text-slate-500 w-12 text-right">/{max}</span>
    </div>
  )
}
