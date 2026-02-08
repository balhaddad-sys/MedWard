import { createContext } from 'react'
import { MODES } from '../config/modes'
import type { ClinicalMode } from '../config/modes'

export interface ModeContextType {
  mode: ClinicalMode
  setMode: (mode: ClinicalMode) => void
  config: (typeof MODES)[ClinicalMode]
  isTransitioning: boolean
  lastModeSwitch: Date | null
  isModeLocked: boolean
  setModeLocked: (locked: boolean) => void
}

export const ModeContext = createContext<ModeContextType | null>(null)
