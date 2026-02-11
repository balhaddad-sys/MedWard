import { Activity, FlaskConical, ArrowRightLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/uiStore'
import type { WardMode } from '@/types'

const modes: { id: WardMode; label: string; icon: React.ElementType }[] = [
  { id: 'ward', label: 'Clinical', icon: Activity },
  { id: 'clinic', label: 'Lab Triage', icon: FlaskConical },
  { id: 'acute', label: 'Handover', icon: ArrowRightLeft },
]

export function ModeSelector() {
  const currentMode = useUIStore((s) => s.currentMode)
  const setCurrentMode = useUIStore((s) => s.setCurrentMode)

  return (
    <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-100 rounded-lg">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setCurrentMode(mode.id)}
          className={clsx(
            'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[36px]',
            currentMode === mode.id
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-ward-muted hover:text-ward-text'
          )}
        >
          <mode.icon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  )
}
