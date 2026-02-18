import {
  useState,
  useCallback,
  useMemo,
} from 'react'
import type { ReactNode } from 'react'
import { MODES } from '@/config/modes'
import type { ClinicalMode } from '@/config/modes'
import { ModeContext } from './modeContextDef'

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'medward:clinical-mode'

const DEFAULT_MODE: ClinicalMode = 'ward'

function readPersistedMode(): ClinicalMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (stored === 'ward' || stored === 'acute' || stored === 'clerking')) {
      return stored
    }
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota, etc.)
  }
  return DEFAULT_MODE
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ModeProviderProps {
  children: ReactNode
}

export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setModeState] = useState<ClinicalMode>(readPersistedMode)

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
