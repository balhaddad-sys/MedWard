import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Play, Pause, RotateCcw, Plus, X } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'
import { StopwatchIcon } from '@/components/icons/MedicalIcons'

export interface AcuteTimer {
  id: string
  label: string
  targetMs: number
  startedAt: number | null
  isRunning: boolean
  elapsed: number
  patientId?: string
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

/** SVG ring progress indicator */
function RingProgress({ progress, overdue, size = 64 }: { progress: number; overdue: boolean; size?: number }) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const offset = circumference * (1 - clampedProgress)
  const center = size / 2

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700/60"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(
            'transition-all duration-1000',
            overdue ? 'text-red-500' : 'text-green-500'
          )}
        />
      </svg>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <StopwatchIcon className={clsx('w-5 h-5', overdue ? 'text-red-400' : 'text-slate-400')} />
      </div>
    </div>
  )
}

/**
 * Self-contained timer panel with internal state management.
 * Supports preset timers and custom timer creation.
 */
export function TimerPanel() {
  const [timers, setTimers] = useState<AcuteTimer[]>([])
  const [customLabel, setCustomLabel] = useState('')
  const [customMinutes, setCustomMinutes] = useState('15')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const updateTimer = useCallback((timerId: string, updates: Partial<AcuteTimer>) => {
    setTimers((prev) => prev.map((t) => (t.id === timerId ? { ...t, ...updates } : t)))
  }, [])

  const addTimer = useCallback((timer: { label: string; targetMs: number }) => {
    const newTimer: AcuteTimer = {
      id: `timer-${Date.now()}`,
      label: timer.label,
      targetMs: timer.targetMs,
      startedAt: null,
      isRunning: false,
      elapsed: 0,
    }
    setTimers((prev) => [...prev, newTimer])
  }, [])

  const removeTimer = useCallback((timerId: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== timerId))
  }, [])

  // Update elapsed times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        let changed = false
        const updated = prev.map((timer) => {
          if (timer.isRunning && timer.startedAt) {
            const newElapsed = Date.now() - timer.startedAt
            if (!isOverdue(timer.elapsed, timer.targetMs) && isOverdue(newElapsed, timer.targetMs)) {
              triggerHaptic('warning')
            }
            changed = true
            return { ...timer, elapsed: newElapsed }
          }
          return timer
        })
        return changed ? updated : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStartStop = useCallback((timerId: string, isRunning: boolean) => {
    triggerHaptic('tap')
    if (isRunning) {
      updateTimer(timerId, { isRunning: false })
    } else {
      setTimers((prev) =>
        prev.map((t) =>
          t.id === timerId
            ? { ...t, isRunning: true, startedAt: t.startedAt || Date.now() }
            : t
        )
      )
    }
  }, [updateTimer])

  const handleReset = useCallback((timerId: string) => {
    triggerHaptic('tick')
    updateTimer(timerId, { isRunning: false, elapsed: 0, startedAt: null })
  }, [updateTimer])

  const handleAddCustomTimer = () => {
    const minutes = Number.parseInt(customMinutes, 10)
    if (!customLabel.trim() || isNaN(minutes) || minutes <= 0) return

    triggerHaptic('success')
    addTimer({
      label: customLabel,
      targetMs: minutes * 60 * 1000,
    })

    setCustomLabel('')
    setCustomMinutes('15')
    setShowCustomInput(false)
  }

  const isCustomTimerValid = customLabel.trim() && !Number.isNaN(Number.parseInt(customMinutes, 10)) && Number.parseInt(customMinutes, 10) > 0

  return (
    <div className="space-y-4">
      {/* Timer List */}
      <div className="space-y-3">
        {timers.map((timer) => {
          const overdue = isOverdue(timer.elapsed, timer.targetMs)
          const progress = timer.targetMs > 0 ? timer.elapsed / timer.targetMs : 0
          return (
            <div
              key={timer.id}
              className={clsx(
                'rounded-xl border p-4 transition-all',
                'bg-slate-800/40 backdrop-blur-sm border-slate-700/50',
                overdue && 'border-red-500/40 bg-red-900/15 animate-pulse'
              )}
            >
              {/* Timer Header with Ring */}
              <div className="flex items-center gap-4 mb-3">
                <RingProgress progress={progress} overdue={overdue} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{timer.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Target: {formatTime(timer.targetMs)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={clsx('text-2xl font-mono font-bold tabular-nums', overdue ? 'text-red-400' : 'text-green-400')}>
                    {formatTime(timer.elapsed)}
                  </p>
                  {overdue && <p className="text-xs text-red-400 font-semibold mt-1">OVERDUE</p>}
                </div>
              </div>

              {/* Thin Progress Bar */}
              <div className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden mb-3">
                <div
                  className={clsx('h-full rounded-full transition-all', overdue ? 'bg-red-500' : 'bg-green-500')}
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
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-medium transition-colors',
                    timer.isRunning
                      ? 'bg-amber-600/90 hover:bg-amber-600 text-white'
                      : 'bg-green-600/90 hover:bg-green-600 text-white'
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
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium bg-slate-700/60 hover:bg-slate-600/60 text-white transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={() => removeTimer(timer.id)}
                  className="flex items-center justify-center px-3 py-2 rounded-xl font-medium bg-slate-700/40 hover:bg-red-900/40 text-slate-300 hover:text-red-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {timers.length === 0 && !showCustomInput && (
        <div className="text-center py-6">
          <StopwatchIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No active timers</p>
          <p className="text-slate-600 text-xs mt-1">Add a preset or custom timer below</p>
        </div>
      )}

      {/* Add Preset Timer */}
      <div className="border-t border-slate-700/40 pt-4">
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_TIMERS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                triggerHaptic('tap')
                addTimer({
                  label: preset.label,
                  targetMs: preset.minutes * 60 * 1000,
                })
              }}
              className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-500/60 hover:bg-slate-700/40 text-slate-200 text-sm font-medium transition-all"
            >
              <StopwatchIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Timer */}
      <div className="border-t border-slate-700/40 pt-4">
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/40 text-slate-300 font-medium transition-all"
        >
          <Plus className="h-4 w-4" />
          Custom Timer
        </button>

        {showCustomInput && (
          <div className="mt-3 space-y-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Wound Check"
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-600/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-600/50 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomInput(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-700/40 hover:bg-slate-600/40 text-slate-300 font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomTimer}
                disabled={!isCustomTimerValid}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-xl font-medium transition-colors text-sm',
                  isCustomTimerValid
                    ? 'bg-green-600/90 hover:bg-green-600 text-white'
                    : 'bg-slate-700/40 text-slate-500 cursor-not-allowed'
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
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-700/40 hover:bg-slate-600/40 text-slate-300 transition-colors"
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
