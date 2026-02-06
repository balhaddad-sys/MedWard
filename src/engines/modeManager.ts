import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MODES = {
  WARD: 'ward',
  ACUTE: 'acute',
  CLINIC: 'clinic',
} as const

export type AppMode = (typeof MODES)[keyof typeof MODES]

export interface ModeConfig {
  name: string
  description: string
  icon: string
  color: string
}

export const MODE_CONFIG: Record<AppMode, ModeConfig> = {
  ward: { name: 'Ward', description: 'Task management & handover', icon: 'clipboard', color: 'blue' },
  acute: { name: 'Acute', description: 'Calculators & timers', icon: 'alert', color: 'red' },
  clinic: { name: 'Clinic', description: 'Notes & documentation', icon: 'edit', color: 'green' },
}

interface ModeStore {
  currentMode: AppMode
  modeHistory: AppMode[]
  setMode: (mode: AppMode) => void
  goBack: () => void
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set, get) => ({
      currentMode: 'ward',
      modeHistory: [],
      setMode: (mode) => {
        const current = get().currentMode
        if (mode !== current) {
          set({
            currentMode: mode,
            modeHistory: [...get().modeHistory.slice(-4), current],
          })
        }
      },
      goBack: () => {
        const history = get().modeHistory
        if (history.length > 0) {
          const previous = history[history.length - 1]
          set({ currentMode: previous, modeHistory: history.slice(0, -1) })
        }
      },
    }),
    { name: 'medward-mode-storage', partialize: (state) => ({ currentMode: state.currentMode }) }
  )
)

export function useCurrentMode() {
  const currentMode = useModeStore((s) => s.currentMode)
  const setMode = useModeStore((s) => s.setMode)
  return { mode: currentMode, setMode, config: MODE_CONFIG[currentMode] }
}
