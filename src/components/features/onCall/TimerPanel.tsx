import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Timer, Play, Pause, RotateCcw, Plus, X, Clock } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'

export interface AcuteTimer {
  id: string
  label: string
  targetMs: number
  startedAt: number | null
  isRunning: boolean
  elapsed: number
  patientId?: string
}

interface TimerPanelProps {
  timers: AcuteTimer[]
  onTimerUpdate: (timerId: string, timer: Partial<AcuteTimer>) => void
  onTimerAdd: (timer: Omit<AcuteTimer, 'id' | 'startedAt' | 'isRunning' | 'elapsed'>) => void
  onTimerRemove: (timerId: string) => void
}

const PRESET_TIMERS = [
  { label: 'Antibiotics Due', minutes: 60 },
  { label: 'Reassessment', minutes: 30 },
  { label: 'Transfer/ICU', minutes: 240 },
]

const QUICK_PRESETS = [15, 30, 60, 120]

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isOverdue(elapsed: number, target: number): boolean {
  return elapsed > target
}

export function TimerPanel({
  timers,
  onTimerUpdate,
  onTimerAdd,
  onTimerRemove,
}: TimerPanelProps) {
  const [customLabel, setCustomLabel] = useState('')
  const [customMinutes, setCustomMinutes] = useState('15')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Update elapsed times every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      timers.forEach((timer) => {
        if (timer.isRunning && timer.startedAt) {
          const newElapsed = now - timer.startedAt
          onTimerUpdate(timer.id, { elapsed: newElapsed })

          // Haptic feedback when overdue
          if (!isOverdue(timer.elapsed, timer.targetMs) && isOverdue(newElapsed, timer.targetMs)) {
            triggerHaptic('warning')
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timers, onTimerUpdate])

  const handleStartStop = (timerId: string, isRunning: boolean) => {
    triggerHaptic('tap')
    const now = Date.now()
    const timer = timers.find((t) => t.id === timerId)
    if (!timer) return

    if (isRunning) {
      // Stop
      onTimerUpdate(timerId, { isRunning: false })
    } else {
      // Start
      const startedAt = timer.startedAt || now
      onTimerUpdate(timerId, { isRunning: true, startedAt })
    }
  }

  const handleReset = (timerId: string) => {
    triggerHaptic('tick')
    onTimerUpdate(timerId, { isRunning: false, elapsed: 0, startedAt: null })
  }

  const handleAddCustomTimer = () => {
    const minutes = Number.parseInt(customMinutes, 10)
    if (!customLabel.trim() || isNaN(minutes) || minutes <= 0) return

    triggerHaptic('success')
    onTimerAdd({
      label: customLabel,
      targetMs: minutes * 60 * 1000,
    })

    setCustomLabel('')
    setCustomMinutes('15')
    setShowCustomInput(false)
  }

  const handleAddPreset = (minutes: number) => {
    triggerHaptic('tap')
    onTimerAdd({
      label: `Timer ${minutes}min`,
      targetMs: minutes * 60 * 1000,
    })
  }

  const isCustomTimerValid = customLabel.trim() && !Number.isNaN(Number.parseInt(customMinutes, 10)) && Number.parseInt(customMinutes, 10) > 0

  return (
    <div className="space-y-4">
      {/* Timer List */}
      <div className="space-y-3">
        {timers.map((timer) => {
          const overdue = isOverdue(timer.elapsed, timer.targetMs)
          return (
            <div
              key={timer.id}
              className={clsx(
                'rounded-lg border p-4 transition-all',
                'bg-slate-800/50 border-slate-700',
                overdue && 'border-red-500/50 bg-red-900/20 animate-pulse'
              )}
            >
              {/* Timer Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{timer.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Target: {formatTime(timer.targetMs)}</p>
                </div>
                <div className="text-right">
                  <p className={clsx('text-2xl font-mono font-bold tabular-nums', overdue ? 'text-red-400' : 'text-green-400')}>
                    {formatTime(timer.elapsed)}
                  </p>
                  {overdue && <p className="text-xs text-red-400 font-semibold mt-1">OVERDUE</p>}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className={clsx('h-full transition-all', overdue ? 'bg-red-500' : 'bg-green-500')}
                  style={{
                    width: `${Math.min(100, (timer.elapsed / timer.targetMs) * 100)}%`,
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartStop(timer.id, timer.isRunning)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors',
                    timer.isRunning
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  {timer.isRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleReset(timer.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={() => onTimerRemove(timer.id)}
                  className="flex items-center justify-center px-3 py-2 rounded-lg font-medium bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Preset Timer */}
      <div className="border-t border-slate-700 pt-4">
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_TIMERS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                triggerHaptic('tap')
                onTimerAdd({
                  label: preset.label,
                  targetMs: preset.minutes * 60 * 1000,
                })
              }}
              className="py-2 px-3 rounded-lg bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 text-blue-300 text-sm font-medium transition-colors"
            >
              <Clock className="h-4 w-4 inline mr-1" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Timer */}
      <div className="border-t border-slate-700 pt-4">
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Custom Timer
        </button>

        {showCustomInput && (
          <div className="mt-3 space-y-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Wound Check"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Minutes</label>
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min="1"
                max="480"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomInput(false)}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomTimer}
                disabled={!isCustomTimerValid}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm',
                  isCustomTimerValid
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                Add Timer
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setCustomMinutes(String(minutes))}
                  className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  {minutes}min
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
