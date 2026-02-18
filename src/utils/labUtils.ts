import type { LabFlag, LabCategory } from '@/types'

export interface LabReference {
  name: string
  unit: string
  referenceMin: number
  referenceMax: number
  criticalMin?: number
  criticalMax?: number
  category: LabCategory
}

// Kuwait MOH / SI units — matches what Kuwaiti hospital labs print
export const LAB_REFERENCES: Record<string, LabReference> = {
  // CBC
  WBC: { name: 'White Blood Cells', unit: 'x10⁹/L', referenceMin: 4.5, referenceMax: 11.0, criticalMin: 2.0, criticalMax: 30.0, category: 'CBC' },
  RBC: { name: 'Red Blood Cells', unit: 'x10¹²/L', referenceMin: 4.2, referenceMax: 5.9, category: 'CBC' },
  HGB: { name: 'Hemoglobin', unit: 'g/dL', referenceMin: 12.0, referenceMax: 17.5, criticalMin: 7.0, criticalMax: 20.0, category: 'CBC' },
  HCT: { name: 'Hematocrit', unit: '%', referenceMin: 36, referenceMax: 51, criticalMin: 20, criticalMax: 60, category: 'CBC' },
  PLT: { name: 'Platelets', unit: 'x10⁹/L', referenceMin: 150, referenceMax: 400, criticalMin: 50, criticalMax: 1000, category: 'CBC' },
  // Electrolytes (mmol/L — standard in Kuwait)
  NA: { name: 'Sodium', unit: 'mmol/L', referenceMin: 136, referenceMax: 145, criticalMin: 120, criticalMax: 160, category: 'BMP' },
  K: { name: 'Potassium', unit: 'mmol/L', referenceMin: 3.5, referenceMax: 5.1, criticalMin: 2.5, criticalMax: 6.5, category: 'BMP' },
  CL: { name: 'Chloride', unit: 'mmol/L', referenceMin: 98, referenceMax: 107, category: 'BMP' },
  CO2: { name: 'Bicarbonate', unit: 'mmol/L', referenceMin: 22, referenceMax: 29, criticalMin: 15, criticalMax: 40, category: 'BMP' },
  // Renal (Kuwait SI units)
  UREA: { name: 'Urea', unit: 'mmol/L', referenceMin: 2.5, referenceMax: 7.1, category: 'BMP' },
  CR: { name: 'Creatinine', unit: 'umol/L', referenceMin: 62, referenceMax: 115, criticalMax: 884, category: 'BMP' },
  // Glucose (Kuwait uses mmol/L)
  GLU: { name: 'Glucose', unit: 'mmol/L', referenceMin: 3.9, referenceMax: 5.6, criticalMin: 2.2, criticalMax: 27.8, category: 'BMP' },
  // CMP
  CA: { name: 'Calcium', unit: 'mmol/L', referenceMin: 2.15, referenceMax: 2.60, criticalMin: 1.50, criticalMax: 3.25, category: 'CMP' },
  TP: { name: 'Total Protein', unit: 'g/L', referenceMin: 60, referenceMax: 83, category: 'CMP' },
  ALB: { name: 'Albumin', unit: 'g/L', referenceMin: 35, referenceMax: 50, category: 'CMP' },
  // LFT
  AST: { name: 'AST', unit: 'U/L', referenceMin: 10, referenceMax: 40, category: 'LFT' },
  ALT: { name: 'ALT', unit: 'U/L', referenceMin: 7, referenceMax: 56, category: 'LFT' },
  ALP: { name: 'Alk Phos', unit: 'U/L', referenceMin: 44, referenceMax: 147, category: 'LFT' },
  TBILI: { name: 'Total Bilirubin', unit: 'umol/L', referenceMin: 1.7, referenceMax: 20.5, category: 'LFT' },
  DBILI: { name: 'Direct Bilirubin', unit: 'umol/L', referenceMin: 0, referenceMax: 3.4, category: 'LFT' },
  // Coagulation
  INR: { name: 'INR', unit: '', referenceMin: 0.8, referenceMax: 1.2, criticalMax: 5.0, category: 'COAG' },
  PTT: { name: 'APTT', unit: 'sec', referenceMin: 25, referenceMax: 35, criticalMax: 100, category: 'COAG' },
  // Cardiac
  TROP: { name: 'Troponin I', unit: 'ng/mL', referenceMin: 0, referenceMax: 0.04, criticalMax: 0.4, category: 'CARDIAC' },
  BNP: { name: 'BNP', unit: 'pg/mL', referenceMin: 0, referenceMax: 100, category: 'CARDIAC' },
  CK: { name: 'CK', unit: 'U/L', referenceMin: 30, referenceMax: 200, category: 'CARDIAC' },
  // Thyroid
  TSH: { name: 'TSH', unit: 'mIU/L', referenceMin: 0.27, referenceMax: 4.20, category: 'THYROID' },
  FT4: { name: 'Free T4', unit: 'pmol/L', referenceMin: 12.0, referenceMax: 22.0, category: 'THYROID' },
  FT3: { name: 'Free T3', unit: 'pmol/L', referenceMin: 3.1, referenceMax: 6.8, category: 'THYROID' },
  // Misc
  LACT: { name: 'Lactate', unit: 'mmol/L', referenceMin: 0.5, referenceMax: 2.2, criticalMax: 4.0, category: 'MISC' },
  MG: { name: 'Magnesium', unit: 'mmol/L', referenceMin: 0.73, referenceMax: 1.06, criticalMin: 0.4, criticalMax: 1.5, category: 'BMP' },
  PO4: { name: 'Phosphate', unit: 'mmol/L', referenceMin: 0.81, referenceMax: 1.45, category: 'BMP' },
  URATE: { name: 'Urate', unit: 'umol/L', referenceMin: 208, referenceMax: 428, category: 'MISC' },
  OSM: { name: 'Osmolality', unit: 'mmol/kg', referenceMin: 275, referenceMax: 300, criticalMin: 260, criticalMax: 320, category: 'BMP' },
  ADJCA: { name: 'Adjusted Calcium', unit: 'mmol/L', referenceMin: 2.20, referenceMax: 2.60, criticalMin: 1.80, criticalMax: 3.00, category: 'CMP' },
  AG: { name: 'Anion Gap', unit: 'mmol/L', referenceMin: 8, referenceMax: 16, category: 'BMP' },
  GGT: { name: 'GGT', unit: 'U/L', referenceMin: 3, referenceMax: 50, category: 'LFT' },
  // Lipids
  CHOL: { name: 'Total Cholesterol', unit: 'mmol/L', referenceMin: 0, referenceMax: 5.2, category: 'MISC' },
  LDL: { name: 'LDL Cholesterol', unit: 'mmol/L', referenceMin: 0, referenceMax: 3.4, category: 'MISC' },
  HDL: { name: 'HDL Cholesterol', unit: 'mmol/L', referenceMin: 1.03, referenceMax: 1.55, category: 'MISC' },
  TG: { name: 'Triglycerides', unit: 'mmol/L', referenceMin: 0, referenceMax: 1.7, category: 'MISC' },
  // Inflammatory
  CRP: { name: 'CRP', unit: 'mg/L', referenceMin: 0, referenceMax: 5, category: 'MISC' },
  ESR: { name: 'ESR', unit: 'mm/hr', referenceMin: 0, referenceMax: 20, category: 'MISC' },
  // Iron
  FERRITIN: { name: 'Ferritin', unit: 'ug/L', referenceMin: 20, referenceMax: 250, category: 'MISC' },
  // HbA1c
  HBA1C: { name: 'HbA1c', unit: '%', referenceMin: 4.0, referenceMax: 5.6, category: 'MISC' },
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
