import React, { useState, useEffect, useCallback } from 'react'
import { MODES } from '../config/modes'
import type { ClinicalMode } from '../config/modes'
import { triggerHaptic } from '../utils/haptics'
import { ModeContext } from './modeContextDef'

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ClinicalMode>(() => {
    const saved = localStorage.getItem('clinical_mode') as ClinicalMode
    return saved && saved in MODES ? saved : 'ward'
  })

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

      document.body.className = MODES[newMode].theme
      localStorage.setItem('clinical_mode', newMode)

      setTimeout(() => {
        setModeState(newMode)
        setLastModeSwitch(new Date())
        setIsTransitioning(false)
      }, 150)
    },
    [mode, lastModeSwitch, isModeLocked]
  )

  useEffect(() => {
    document.body.className = MODES[mode].theme
  }, [mode])

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
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


