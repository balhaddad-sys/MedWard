import { useContext } from 'react'
import { ModeContext } from './modeContextDef'

export const useClinicalMode = () => {
  const context = useContext(ModeContext)
  if (!context) {
    throw new Error('useClinicalMode must be used within ModeProvider')
  }
  return context
}
