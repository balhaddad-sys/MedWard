import { useContext } from 'react'
import { ModeContext } from './modeContextDef'
import type { ModeContextValue } from './modeContextDef'

export function useModeContext(): ModeContextValue {
  const ctx = useContext(ModeContext)
  if (!ctx) {
    throw new Error('useModeContext must be used within a <ModeProvider>')
  }
  return ctx
}
