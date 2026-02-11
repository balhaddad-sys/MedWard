import { ClipboardList, Siren, Stethoscope } from 'lucide-react'
import { clsx } from 'clsx'
import { useClinicalMode } from '@/context/useClinicalMode'
import type { ClinicalMode } from '@/config/modes'

const modes: { id: ClinicalMode; label: string; icon: React.ElementType }[] = [
  { id: 'ward', label: 'Ward', icon: ClipboardList },
  { id: 'acute', label: 'On-Call', icon: Siren },
  { id: 'clinic', label: 'Clinic', icon: Stethoscope },
]

export function ModeSelector() {
  const { mode, setMode, isModeLocked } = useClinicalMode()

  return (
    <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-100 rounded-lg">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          disabled={isModeLocked}
          className={clsx(
            'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[36px]',
            mode === m.id
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-ward-muted hover:text-ward-text',
            isModeLocked && mode !== m.id && 'opacity-40 cursor-not-allowed'
          )}
        >
          <m.icon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  )
}
