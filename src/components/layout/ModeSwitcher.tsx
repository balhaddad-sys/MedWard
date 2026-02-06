import { ClipboardList, AlertCircle, FileEdit } from 'lucide-react'
import { clsx } from 'clsx'
import { MODES, MODE_CONFIG, useModeStore } from '@/engines/modeManager'
import type { AppMode } from '@/engines/modeManager'

const modeIcons: Record<AppMode, React.ElementType> = {
  ward: ClipboardList,
  acute: AlertCircle,
  clinic: FileEdit,
}

export function ModeSwitcher() {
  const currentMode = useModeStore((s) => s.currentMode)
  const setMode = useModeStore((s) => s.setMode)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ward-border safe-bottom z-30">
      <div className="flex justify-around max-w-lg mx-auto">
        {(Object.keys(MODE_CONFIG) as AppMode[]).map((mode) => {
          const config = MODE_CONFIG[mode]
          const Icon = modeIcons[mode]
          const isActive = currentMode === mode

          return (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={clsx(
                'relative flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-primary-600' : 'text-ward-muted hover:text-ward-text'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={clsx('text-xs', isActive && 'font-semibold')}>{config.name}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
