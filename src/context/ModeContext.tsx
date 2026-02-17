import React, { useState, useEffect, useCallback } from 'react'
import { MODES } from '../config/modes'
import type { ClinicalMode } from '../config/modes'
import { triggerHaptic } from '../utils/haptics'
import { ModeContext } from './modeContextDef'

const THEME_CLASSES = Object.values(MODES).map((m) => m.theme)

function applyThemeClass(theme: string) {
  document.body.classList.remove(...THEME_CLASSES)
  document.body.classList.add(theme)
}

const MODE_SELECTION_SESSION_KEY = 'clinical_mode_selected'

function getInitialMode(): ClinicalMode {
  const saved = localStorage.getItem('clinical_mode') as ClinicalMode
  if (saved && saved in MODES) return saved

  // Fall back to user's defaultMode from settings (persisted by zustand)
  try {
    const settings = localStorage.getItem('medward-settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      const defaultMode = parsed?.state?.defaultMode as ClinicalMode
      if (defaultMode && defaultMode in MODES) return defaultMode
    }
  } catch {
    // ignore
  }

  return 'ward'
}

function getInitialModeSelection(): boolean {
  try {
    return sessionStorage.getItem(MODE_SELECTION_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ClinicalMode>(getInitialMode)
  const [isModeSelected, setIsModeSelected] = useState<boolean>(getInitialModeSelection)

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [lastModeSwitch, setLastModeSwitch] = useState<Date | null>(null)
  const [isModeLocked, setModeLocked] = useState(false)

  const setMode = useCallback(
    (newMode: ClinicalMode) => {
      if (mode === newMode) return
      if (isModeLocked) return
      if (lastModeSwitch && Date.now() - lastModeSwitch.getTime() < 500) return

      const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'MODE_SWITCH',
        fromMode: mode,
        toMode: newMode,
        userId: localStorage.getItem('user_id') || 'unknown',
      }

      if (newMode === 'acute') {
        console.info(`[AUDIT] ACUTE mode entered at ${auditEntry.timestamp}`)
      }

      // TODO: Write audit to Firestore:
      // db.collection('audit_logs').add(auditEntry)

      setIsTransitioning(true)
      triggerHaptic('modeSwitch')

      applyThemeClass(MODES[newMode].theme)
      localStorage.setItem('clinical_mode', newMode)

      setTimeout(() => {
        setModeState(newMode)
        setLastModeSwitch(new Date())
        setIsTransitioning(false)
      }, 150)
    },
    [mode, lastModeSwitch, isModeLocked]
  )

  const confirmModeSelection = useCallback((newMode: ClinicalMode) => {
    setMode(newMode)
    setIsModeSelected(true)
    try {
      sessionStorage.setItem(MODE_SELECTION_SESSION_KEY, '1')
    } catch {
      // ignore browser storage errors
    }
  }, [setMode])

  useEffect(() => {
    applyThemeClass(MODES[mode].theme)
  }, [mode])

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        isModeSelected,
        confirmModeSelection,
        config: MODES[mode],
        isTransitioning,
        lastModeSwitch,
        isModeLocked,
        setModeLocked,
      }}
    >
      {children}
    </ModeContext.Provider>
  )
}


