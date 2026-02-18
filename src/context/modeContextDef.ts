import { createContext } from 'react'
import type { ClinicalMode, ModeConfig } from '@/config/modes'

export interface ModeContextValue {
  mode: ClinicalMode
  setMode: (mode: ClinicalMode) => void
  modeConfig: ModeConfig
}

export const ModeContext = createContext<ModeContextValue | null>(null)
