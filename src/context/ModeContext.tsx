import {
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react'
import type { ReactNode } from 'react'
import { MODES } from '@/config/modes'
import type { ClinicalMode } from '@/config/modes'
import { useSettingsStore } from '@/stores/settingsStore'
import { ModeContext } from './modeContextDef'

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'medward:clinical-mode'

function readPersistedMode(fallback: ClinicalMode): ClinicalMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (stored === 'ward' || stored === 'acute')) {
      return stored
    }
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota, etc.)
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ModeProviderProps {
  children: ReactNode
}

export function ModeProvider({ children }: ModeProviderProps) {
  const defaultMode = useSettingsStore((s) => s.defaultMode)
  const [mode, setModeState] = useState<ClinicalMode>(() => readPersistedMode(defaultMode))

  // Sync data-mode attribute on <html> so CSS [data-mode] selectors apply
  useLayoutEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  const setMode = useCallback((next: ClinicalMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Silently ignore write failures
    }
  }, [])

  const modeConfig = useMemo(() => MODES[mode], [mode])

  const value = useMemo(
    () => ({ mode, setMode, modeConfig }),
    [mode, setMode, modeConfig],
  )

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
