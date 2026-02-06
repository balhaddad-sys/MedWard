import type { LabValue, LabFlag, LabCategory } from '@/types'

export interface LabReference {
  name: string
  unit: string
  referenceMin: number
  referenceMax: number
  criticalMin?: number
  criticalMax?: number
  category: LabCategory
}

export const LAB_REFERENCES: Record<string, LabReference> = {
  WBC: { name: 'White Blood Cells', unit: 'x10³/µL', referenceMin: 4.5, referenceMax: 11.0, criticalMin: 2.0, criticalMax: 30.0, category: 'CBC' },
  RBC: { name: 'Red Blood Cells', unit: 'x10⁶/µL', referenceMin: 4.2, referenceMax: 5.9, category: 'CBC' },
  HGB: { name: 'Hemoglobin', unit: 'g/dL', referenceMin: 12.0, referenceMax: 17.5, criticalMin: 7.0, criticalMax: 20.0, category: 'CBC' },
  HCT: { name: 'Hematocrit', unit: '%', referenceMin: 36, referenceMax: 51, criticalMin: 20, criticalMax: 60, category: 'CBC' },
  PLT: { name: 'Platelets', unit: 'x10³/µL', referenceMin: 150, referenceMax: 400, criticalMin: 50, criticalMax: 1000, category: 'CBC' },
  NA: { name: 'Sodium', unit: 'mEq/L', referenceMin: 136, referenceMax: 145, criticalMin: 120, criticalMax: 160, category: 'BMP' },
  K: { name: 'Potassium', unit: 'mEq/L', referenceMin: 3.5, referenceMax: 5.0, criticalMin: 2.5, criticalMax: 6.5, category: 'BMP' },
  CL: { name: 'Chloride', unit: 'mEq/L', referenceMin: 98, referenceMax: 106, category: 'BMP' },
  CO2: { name: 'CO2', unit: 'mEq/L', referenceMin: 23, referenceMax: 29, criticalMin: 15, criticalMax: 40, category: 'BMP' },
  BUN: { name: 'BUN', unit: 'mg/dL', referenceMin: 7, referenceMax: 20, category: 'BMP' },
  CR: { name: 'Creatinine', unit: 'mg/dL', referenceMin: 0.7, referenceMax: 1.3, criticalMax: 10.0, category: 'BMP' },
  GLU: { name: 'Glucose', unit: 'mg/dL', referenceMin: 70, referenceMax: 100, criticalMin: 40, criticalMax: 500, category: 'BMP' },
  CA: { name: 'Calcium', unit: 'mg/dL', referenceMin: 8.5, referenceMax: 10.5, criticalMin: 6.0, criticalMax: 13.0, category: 'CMP' },
  TP: { name: 'Total Protein', unit: 'g/dL', referenceMin: 6.0, referenceMax: 8.3, category: 'CMP' },
  ALB: { name: 'Albumin', unit: 'g/dL', referenceMin: 3.5, referenceMax: 5.0, category: 'CMP' },
  AST: { name: 'AST', unit: 'U/L', referenceMin: 10, referenceMax: 40, category: 'LFT' },
  ALT: { name: 'ALT', unit: 'U/L', referenceMin: 7, referenceMax: 56, category: 'LFT' },
  ALP: { name: 'Alk Phos', unit: 'U/L', referenceMin: 44, referenceMax: 147, category: 'LFT' },
  TBILI: { name: 'Total Bilirubin', unit: 'mg/dL', referenceMin: 0.1, referenceMax: 1.2, category: 'LFT' },
  INR: { name: 'INR', unit: '', referenceMin: 0.8, referenceMax: 1.2, criticalMax: 5.0, category: 'COAG' },
  PTT: { name: 'PTT', unit: 'sec', referenceMin: 25, referenceMax: 35, criticalMax: 100, category: 'COAG' },
  TROP: { name: 'Troponin I', unit: 'ng/mL', referenceMin: 0, referenceMax: 0.04, criticalMax: 0.4, category: 'CARDIAC' },
  BNP: { name: 'BNP', unit: 'pg/mL', referenceMin: 0, referenceMax: 100, category: 'CARDIAC' },
  TSH: { name: 'TSH', unit: 'mIU/L', referenceMin: 0.4, referenceMax: 4.0, category: 'THYROID' },
  LACT: { name: 'Lactate', unit: 'mmol/L', referenceMin: 0.5, referenceMax: 2.2, criticalMax: 4.0, category: 'MISC' },
}

export const flagLabValue = (value: number, ref: LabReference): LabFlag => {
  if (ref.criticalMin !== undefined && value < ref.criticalMin) return 'critical_low'
  if (ref.criticalMax !== undefined && value > ref.criticalMax) return 'critical_high'
  if (value < ref.referenceMin) return 'low'
  if (value > ref.referenceMax) return 'high'
  return 'normal'
}

export const getLabFlagColor = (flag: LabFlag): string => {
  switch (flag) {
    case 'critical_low':
    case 'critical_high':
      return 'text-red-600 font-bold'
    case 'low':
      return 'text-blue-600'
    case 'high':
      return 'text-orange-600'
    default:
      return 'text-green-700'
  }
}

export const getLabFlagBg = (flag: LabFlag): string => {
  switch (flag) {
    case 'critical_low':
    case 'critical_high':
      return 'bg-red-50 border-red-200'
    case 'low':
      return 'bg-blue-50 border-blue-200'
    case 'high':
      return 'bg-orange-50 border-orange-200'
    default:
      return 'bg-green-50 border-green-200'
  }
}

export const getLabFlagLabel = (flag: LabFlag): string => {
  switch (flag) {
    case 'critical_low': return 'CRIT LOW'
    case 'critical_high': return 'CRIT HIGH'
    case 'low': return 'LOW'
    case 'high': return 'HIGH'
    default: return 'NORMAL'
  }
}
