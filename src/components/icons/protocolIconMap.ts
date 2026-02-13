import type { FC } from 'react'
import {
  HeartRhythmIcon,
  SyringeIcon,
  FlaskIcon,
  LightningIcon,
  BrainIcon,
  LungsIcon,
  StethoscopeIcon,
  BloodClotIcon,
} from './MedicalIcons'

export const PROTOCOL_ICON_MAP: Record<string, FC<{ className?: string }>> = {
  'chest-pain-acs': HeartRhythmIcon,
  'sepsis-six': SyringeIcon,
  'dka-protocol': FlaskIcon,
  hyperkalemia: LightningIcon,
  stroke: BrainIcon,
  pneumonia: LungsIcon,
  aki: StethoscopeIcon,
  'gi-bleed': BloodClotIcon,
}
