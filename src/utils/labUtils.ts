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

/* -------------------------------------------------------------------------- */
/*  Cell parsing — clean raw lab values from AI extraction                    */
/* -------------------------------------------------------------------------- */

/**
 * Parse a raw lab value cell: strip embedded flags, extract numeric value.
 * Handles formats like "5.5 H", "0.67 L", "142", "3.5HH", "< 0.01", etc.
 */
export function parseCell(raw: string | number | null | undefined): {
  value: number | null
  display: string
  flagHint: LabFlag | null
} {
  if (raw == null) return { value: null, display: '--', flagHint: null }
  if (typeof raw === 'number') {
    return {
      value: Number.isFinite(raw) ? raw : null,
      display: Number.isFinite(raw) ? String(raw) : '--',
      flagHint: null,
    }
  }

  const rawStr = String(raw).trim()
  if (!rawStr || /^(null|undefined|nan|n\/a|--|-)$/i.test(rawStr)) {
    return { value: null, display: '--', flagHint: null }
  }

  // Detect embedded flags (order matters: HH/LL and CH/CL before H/L)
  let flagHint: LabFlag | null = null
  let cleaned = rawStr

  if (/\s*\bHH\b\s*/i.test(cleaned)) {
    flagHint = 'critical_high'
    cleaned = cleaned.replace(/\s*\bHH\b\s*/gi, ' ').trim()
  } else if (/\s*\bLL\b\s*/i.test(cleaned)) {
    flagHint = 'critical_low'
    cleaned = cleaned.replace(/\s*\bLL\b\s*/gi, ' ').trim()
  } else if (/\s*(CH)\s*$/i.test(cleaned)) {
    flagHint = 'critical_high'
    cleaned = cleaned.replace(/\s*CH\s*$/gi, '').trim()
  } else if (/\s*(CL)\s*$/i.test(cleaned)) {
    flagHint = 'critical_low'
    cleaned = cleaned.replace(/\s*CL\s*$/gi, '').trim()
  } else if (/\s+H\s*$/i.test(cleaned) || /(?<=\d)\s*H$/i.test(cleaned)) {
    flagHint = 'high'
    cleaned = cleaned.replace(/\s*H\s*$/gi, '').trim()
  } else if (/\s+L\s*$/i.test(cleaned) || /(?<=\d)\s*L$/i.test(cleaned)) {
    flagHint = 'low'
    cleaned = cleaned.replace(/\s*L\s*$/gi, '').trim()
  }

  // Strip commas from number formatting (e.g. "1,234")
  cleaned = cleaned.replace(/,/g, '')
  // Normalize dashes
  cleaned = cleaned.replace(/[–—−]/g, '-')

  // Extract numeric value
  const numMatch = cleaned.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/)
  const value = numMatch ? parseFloat(numMatch[0]) : null

  return {
    value: value !== null && Number.isFinite(value) ? value : null,
    display: value !== null && Number.isFinite(value) ? String(value) : cleaned || '--',
    flagHint,
  }
}

/* -------------------------------------------------------------------------- */
/*  Test name canonicalization                                                */
/* -------------------------------------------------------------------------- */

/** Map from backend analyte_key to short clinical display name */
export const CANONICAL_DISPLAY_NAMES: Record<string, string> = {
  // CBC
  white_blood_cells: 'WBC', red_blood_cells: 'RBC', hemoglobin: 'HGB',
  hematocrit: 'HCT', platelets: 'PLT', mcv: 'MCV', mch: 'MCH',
  mchc: 'MCHC', rdw: 'RDW', mpv: 'MPV',
  // Differential
  neutrophils: 'Neutrophils', lymphocytes: 'Lymphocytes',
  monocytes: 'Monocytes', eosinophils: 'Eosinophils', basophils: 'Basophils',
  // Electrolytes
  sodium: 'Na', potassium: 'K', chloride: 'Cl', bicarbonate: 'CO2',
  calcium: 'Ca', magnesium: 'Mg', phosphate: 'PO4',
  // Renal
  bun: 'Urea', creatinine: 'Cr', egfr: 'eGFR',
  // Glucose
  glucose: 'Glucose',
  // Liver
  alt: 'ALT', ast: 'AST', ggt: 'GGT', alp: 'ALP',
  total_bilirubin: 'T.Bili', direct_bilirubin: 'D.Bili',
  albumin: 'Albumin', total_protein: 'T.Protein',
  // Coagulation
  pt: 'PT', inr: 'INR', aptt: 'APTT',
  // Cardiac
  troponin_i: 'Troponin I', hs_troponin_i: 'hs-TnI',
  troponin_t: 'Troponin T', hs_troponin_t: 'hs-TnT',
  bnp: 'BNP', nt_probnp: 'NT-proBNP', ck: 'CK', ck_mb: 'CK-MB', ldh: 'LDH',
  // Thyroid
  tsh: 'TSH', free_t4: 'FT4', free_t3: 'FT3',
  // Iron
  iron: 'Iron', ferritin: 'Ferritin', tibc: 'TIBC',
  // Inflammatory
  crp: 'CRP', esr: 'ESR', procalcitonin: 'Procalcitonin',
  // HbA1c
  hba1c: 'HbA1c',
  // Lipid
  total_cholesterol: 'T.Chol', ldl: 'LDL', hdl: 'HDL',
  triglycerides: 'TG', non_hdl_cholesterol: 'Non-HDL',
  // Calculated
  osmolality: 'Osmolality', adjusted_calcium: 'Adj Ca', anion_gap: 'Anion Gap',
  // Other
  urate: 'Urate',
  // ABG
  ph: 'pH', pco2: 'pCO2', po2: 'pO2', sao2: 'SaO2', lactate: 'Lactate',
}

/** Map analyte_key to LAB_REFERENCES key for reference range lookup */
const ANALYTE_TO_REF_KEY: Record<string, string> = {
  white_blood_cells: 'WBC', red_blood_cells: 'RBC', hemoglobin: 'HGB',
  hematocrit: 'HCT', platelets: 'PLT',
  sodium: 'NA', potassium: 'K', chloride: 'CL', bicarbonate: 'CO2',
  bun: 'UREA', creatinine: 'CR', glucose: 'GLU',
  calcium: 'CA', total_protein: 'TP', albumin: 'ALB',
  ast: 'AST', alt: 'ALT', alp: 'ALP',
  total_bilirubin: 'TBILI', direct_bilirubin: 'DBILI',
  inr: 'INR', aptt: 'PTT',
  troponin_i: 'TROP', bnp: 'BNP', ck: 'CK',
  tsh: 'TSH', free_t4: 'FT4', free_t3: 'FT3',
  lactate: 'LACT', magnesium: 'MG', phosphate: 'PO4',
  urate: 'URATE', osmolality: 'OSM', adjusted_calcium: 'ADJCA',
  anion_gap: 'AG', ggt: 'GGT',
  total_cholesterol: 'CHOL', ldl: 'LDL', hdl: 'HDL', triglycerides: 'TG',
  crp: 'CRP', esr: 'ESR', ferritin: 'FERRITIN', hba1c: 'HBA1C',
}

/**
 * Get canonical display name from analyte_key, with fallback to raw test_name.
 */
export function canonicalizeTestName(analyteKey: string | undefined, fallbackTestName: string): string {
  if (analyteKey && CANONICAL_DISPLAY_NAMES[analyteKey]) {
    return CANONICAL_DISPLAY_NAMES[analyteKey]
  }
  return fallbackTestName || analyteKey || 'Unknown'
}

/**
 * Look up reference range from LAB_REFERENCES using analyte_key.
 */
export function getRefRangeForAnalyte(analyteKey: string | undefined): { min: number; max: number } | null {
  if (!analyteKey) return null
  const refKey = ANALYTE_TO_REF_KEY[analyteKey]
  if (!refKey) return null
  const ref = LAB_REFERENCES[refKey]
  if (!ref) return null
  return { min: ref.referenceMin, max: ref.referenceMax }
}

/**
 * Infer panel category from analyte_keys present in extracted results.
 */
export function inferCategory(analyteKeys: string[]): LabCategory {
  const counts: Partial<Record<LabCategory, number>> = {}

  for (const key of analyteKeys) {
    const refKey = ANALYTE_TO_REF_KEY[key]
    if (!refKey) continue
    const ref = LAB_REFERENCES[refKey]
    if (!ref) continue
    counts[ref.category] = (counts[ref.category] || 0) + 1
  }

  let best: LabCategory = 'MISC'
  let bestCount = 0
  for (const [cat, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = cat as LabCategory
      bestCount = count
    }
  }
  return best
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

export interface ValidationWarning {
  type: 'empty_panel' | 'duplicate_values' | 'misaligned'
  message: string
  severity: 'error' | 'warning'
}

/**
 * Validate extracted lab values. Returns warnings if data looks suspicious.
 */
export function validateExtractedValues(values: { value: number | string; name: string }[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  if (values.length === 0) {
    warnings.push({ type: 'empty_panel', message: 'No lab values extracted', severity: 'error' })
    return warnings
  }

  // All-same numeric values → likely misaligned extraction
  const nums = values
    .map((v) => parseCell(v.value).value)
    .filter((v): v is number => v !== null)

  if (nums.length > 3 && nums.every((v) => v === nums[0])) {
    warnings.push({
      type: 'misaligned',
      message: `All ${nums.length} values are identical (${nums[0]}) — possible extraction error`,
      severity: 'warning',
    })
  }

  // Duplicate test names
  const nameCount = new Map<string, number>()
  for (const v of values) {
    const key = v.name.toLowerCase().trim()
    nameCount.set(key, (nameCount.get(key) || 0) + 1)
  }
  const duplicates = [...nameCount.entries()].filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    warnings.push({
      type: 'duplicate_values',
      message: `Duplicate tests: ${duplicates.map(([name, count]) => `${name} (x${count})`).join(', ')}`,
      severity: 'warning',
    })
  }

  return warnings
}
