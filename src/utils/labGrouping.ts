import type { LabTestResult } from '@/components/features/labs/LabResultRow'

export interface LabGroup {
  name: string
  tests: LabTestResult[]
}

const SYSTEM_GROUPS: Record<string, string[]> = {
  'Renal Profile': ['CREAT', 'UREA', 'BUN', 'EGFR', 'SODIUM', 'NA', 'POTASSIUM', 'K', 'CHLORIDE', 'CL', 'BICARBONATE', 'HCO3', 'CO2', 'ANION GAP', 'OSMOLALITY', 'CAL OSMOLALITY', 'URATE', 'URIC ACID'],
  'Liver Function': ['ALT', 'SGPT', 'AST', 'SGOT', 'GGT', 'ALP', 'ALK PHOS', 'BILIRUBIN', 'BILI', 'TBILI', 'DBILI', 'T BIL', 'TOTAL PROTEIN', 'TP', 'T PROTEIN', 'ALBUMIN', 'ALB', 'GLOBULIN'],
  'Bone & Minerals': ['CALCIUM', 'CA', 'ADJ CA', 'ADJUSTED CALCIUM', 'CORRECTED CALCIUM', 'PHOSPHATE', 'PHOS', 'PO4', 'MAGNESIUM', 'MG', 'VITAMIN D', 'VIT D', '25-OH VIT D', 'PTH'],
  'Complete Blood Count': ['HB', 'HGB', 'HEMOGLOBIN', 'WBC', 'PLT', 'PLATELETS', 'RBC', 'HCT', 'HEMATOCRIT', 'MCV', 'MCH', 'MCHC', 'RDW', 'NEUTROPHILS', 'NEUT', 'LYMPHOCYTES', 'LYMPH', 'MONOCYTES', 'MONO', 'EOSINOPHILS', 'EOS', 'BASOPHILS', 'BASO'],
  'Metabolic': ['GLUCOSE', 'GLUC', 'FBG', 'HBA1C', 'A1C', 'GLYCATED HB', 'INSULIN', 'C-PEPTIDE', 'LACTATE'],
  'Lipid Panel': ['CHOLESTEROL', 'CHOL', 'TOTAL CHOL', 'T CHOL', 'LDL', 'LDL CHOL', 'HDL', 'HDL CHOL', 'TRIGLYCERIDES', 'TG', 'VLDL', 'NON HDL', 'NON HDL CHOL', 'NON-HDL'],
  'Thyroid': ['TSH', 'FT4', 'FREE T4', 'FREET4', 'FT3', 'FREE T3', 'FREET3', 'T4', 'T3'],
  'Coagulation': ['PT', 'INR', 'APTT', 'PTT', 'FIBRINOGEN', 'D-DIMER'],
  'Cardiac': ['TROPONIN', 'TROP', 'TROP I', 'TROP T', 'CK', 'CK-MB', 'BNP', 'NT-PROBNP', 'LDH'],
  'Iron Studies': ['IRON', 'FE', 'FERRITIN', 'TIBC', 'TRANSFERRIN', 'TSAT'],
  'Inflammatory': ['CRP', 'ESR', 'PROCALCITONIN', 'PCT', 'IL-6'],
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim()
}

export function groupLabResults(tests: LabTestResult[]): LabGroup[] {
  const grouped: Record<string, LabTestResult[]> = {}
  const assigned = new Set<number>()

  // Assign tests to groups
  for (const [groupName, codes] of Object.entries(SYSTEM_GROUPS)) {
    const matches: LabTestResult[] = []
    tests.forEach((test, idx) => {
      if (assigned.has(idx)) return
      const norm = normalizeCode(test.code || test.name)
      if (codes.some((c) => norm === c || norm.includes(c) || c.includes(norm))) {
        matches.push(test)
        assigned.add(idx)
      }
    })
    if (matches.length > 0) {
      grouped[groupName] = matches
    }
  }

  // Collect unassigned into "Other"
  const other = tests.filter((_, idx) => !assigned.has(idx))
  if (other.length > 0) {
    grouped['Other'] = other
  }

  // Return in defined order
  const orderedNames = Object.keys(SYSTEM_GROUPS)
  const result: LabGroup[] = []
  for (const name of orderedNames) {
    if (grouped[name]) {
      result.push({ name, tests: grouped[name] })
    }
  }
  if (grouped['Other']) {
    result.push({ name: 'Other', tests: grouped['Other'] })
  }

  return result
}
