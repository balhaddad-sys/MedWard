import type { FC } from 'react'
import {
  BloodPressureIcon,
  BrainIcon,
  HeartbeatIcon,
  LungsIcon,
  FlaskIcon,
  LightningIcon,
  HeartRhythmIcon,
  BloodClotIcon,
} from './MedicalIcons'

export const CALCULATOR_ICON_MAP: Record<string, FC<{ className?: string }>> = {
  map: BloodPressureIcon,
  gcs: BrainIcon,
  news2: HeartbeatIcon,
  curb65: LungsIcon,
  calcium: FlaskIcon,
  qtc: LightningIcon,
  cha2ds2vasc: HeartRhythmIcon,
  wells: BloodClotIcon,
  aniongap: FlaskIcon,
}
