/**
 * Clinical Reference Data
 * MedWard Pro v9.0.0
 * 
 * Kuwait SI Units throughout
 */

// Lab Reference Ranges
export const REFERENCE_RANGES = {
  // Renal Function
  Creatinine: { low: 62, high: 106, unit: 'μmol/L', criticalHigh: 500, category: 'Renal' },
  Urea: { low: 2.5, high: 7.1, unit: 'mmol/L', category: 'Renal' },
  eGFR: { low: 90, high: 999, unit: 'mL/min/1.73m²', category: 'Renal' },

  // Electrolytes
  Sodium: { low: 136, high: 145, unit: 'mmol/L', criticalLow: 120, criticalHigh: 160, category: 'Electrolytes' },
  Potassium: { low: 3.5, high: 5.0, unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 6.5, category: 'Electrolytes' },
  Chloride: { low: 98, high: 106, unit: 'mmol/L', category: 'Electrolytes' },
  Bicarbonate: { low: 22, high: 29, unit: 'mmol/L', category: 'Electrolytes' },
  Calcium: { low: 2.2, high: 2.6, unit: 'mmol/L', criticalLow: 1.6, criticalHigh: 3.5, category: 'Electrolytes' },
  Phosphate: { low: 0.8, high: 1.5, unit: 'mmol/L', category: 'Electrolytes' },
  Magnesium: { low: 0.7, high: 1.0, unit: 'mmol/L', category: 'Electrolytes' },

  // Hematology
  Hemoglobin: { low: 120, high: 160, unit: 'g/L', criticalLow: 70, category: 'Hematology' },
  WBC: { low: 4.0, high: 11.0, unit: '×10⁹/L', category: 'Hematology' },
  Platelets: { low: 150, high: 400, unit: '×10⁹/L', criticalLow: 20, criticalHigh: 1000, category: 'Hematology' },
  Neutrophils: { low: 2.0, high: 7.5, unit: '×10⁹/L', category: 'Hematology' },
  Lymphocytes: { low: 1.0, high: 3.5, unit: '×10⁹/L', category: 'Hematology' },
  MCV: { low: 80, high: 100, unit: 'fL', category: 'Hematology' },
  MCH: { low: 27, high: 32, unit: 'pg', category: 'Hematology' },
  RDW: { low: 11.5, high: 14.5, unit: '%', category: 'Hematology' },

  // Coagulation
  PT: { low: 11, high: 13.5, unit: 'seconds', category: 'Coagulation' },
  INR: { low: 0.9, high: 1.1, unit: '', category: 'Coagulation' },
  APTT: { low: 25, high: 35, unit: 'seconds', category: 'Coagulation' },
  Fibrinogen: { low: 2.0, high: 4.0, unit: 'g/L', category: 'Coagulation' },
  'D-Dimer': { low: 0, high: 0.5, unit: 'mg/L FEU', category: 'Coagulation' },

  // Liver Function
  ALT: { low: 0, high: 40, unit: 'U/L', category: 'Liver' },
  AST: { low: 0, high: 40, unit: 'U/L', category: 'Liver' },
  ALP: { low: 30, high: 120, unit: 'U/L', category: 'Liver' },
  GGT: { low: 0, high: 55, unit: 'U/L', category: 'Liver' },
  Bilirubin: { low: 0, high: 21, unit: 'μmol/L', category: 'Liver' },
  'Bilirubin (Direct)': { low: 0, high: 5, unit: 'μmol/L', category: 'Liver' },
  Albumin: { low: 35, high: 50, unit: 'g/L', category: 'Liver' },
  'Total Protein': { low: 60, high: 80, unit: 'g/L', category: 'Liver' },

  // Cardiac Markers
  Troponin: { low: 0, high: 0.04, unit: 'ng/mL', criticalHigh: 0.04, category: 'Cardiac' },
  'hs-Troponin': { low: 0, high: 14, unit: 'ng/L', criticalHigh: 52, category: 'Cardiac' },
  BNP: { low: 0, high: 100, unit: 'pg/mL', category: 'Cardiac' },
  'NT-proBNP': { low: 0, high: 125, unit: 'pg/mL', category: 'Cardiac' },
  CK: { low: 30, high: 200, unit: 'U/L', category: 'Cardiac' },
  'CK-MB': { low: 0, high: 25, unit: 'U/L', category: 'Cardiac' },

  // Inflammatory
  CRP: { low: 0, high: 5, unit: 'mg/L', category: 'Inflammatory' },
  ESR: { low: 0, high: 20, unit: 'mm/hr', category: 'Inflammatory' },
  Procalcitonin: { low: 0, high: 0.1, unit: 'ng/mL', category: 'Inflammatory' },
  Ferritin: { low: 20, high: 250, unit: 'μg/L', category: 'Inflammatory' },

  // Metabolic
  Glucose: { low: 4.0, high: 6.0, unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 25, category: 'Metabolic' },
  HbA1c: { low: 4.0, high: 5.6, unit: '%', category: 'Metabolic' },
  Lactate: { low: 0.5, high: 2.0, unit: 'mmol/L', criticalHigh: 4.0, category: 'Metabolic' },
  Ammonia: { low: 10, high: 35, unit: 'μmol/L', category: 'Metabolic' },
  Urate: { low: 150, high: 420, unit: 'μmol/L', category: 'Metabolic' },

  // Thyroid
  TSH: { low: 0.4, high: 4.0, unit: 'mIU/L', category: 'Thyroid' },
  'Free T4': { low: 10, high: 23, unit: 'pmol/L', category: 'Thyroid' },
  'Free T3': { low: 3.5, high: 6.5, unit: 'pmol/L', category: 'Thyroid' },

  // ABG
  pH: { low: 7.35, high: 7.45, unit: '', criticalLow: 7.2, criticalHigh: 7.6, category: 'ABG' },
  pCO2: { low: 35, high: 45, unit: 'mmHg', category: 'ABG' },
  pO2: { low: 80, high: 100, unit: 'mmHg', criticalLow: 60, category: 'ABG' },
  'HCO3 (ABG)': { low: 22, high: 26, unit: 'mmol/L', category: 'ABG' },
  'Base Excess': { low: -2, high: 2, unit: 'mmol/L', category: 'ABG' },
  'O2 Sat': { low: 95, high: 100, unit: '%', criticalLow: 90, category: 'ABG' },
};

// Lab categories for grouping in UI
export const LAB_CATEGORIES = [
  { id: 'Renal', name: 'Renal Function', icon: 'Droplet' },
  { id: 'Electrolytes', name: 'Electrolytes', icon: 'Zap' },
  { id: 'Hematology', name: 'Hematology', icon: 'Activity' },
  { id: 'Coagulation', name: 'Coagulation', icon: 'Clock' },
  { id: 'Liver', name: 'Liver Function', icon: 'Pill' },
  { id: 'Cardiac', name: 'Cardiac Markers', icon: 'Heart' },
  { id: 'Inflammatory', name: 'Inflammatory', icon: 'Flame' },
  { id: 'Metabolic', name: 'Metabolic', icon: 'Sparkles' },
  { id: 'Thyroid', name: 'Thyroid', icon: 'Waves' },
  { id: 'ABG', name: 'Arterial Blood Gas', icon: 'Wind' },
];

// Clinical Protocols
export const CLINICAL_PROTOCOLS = {
  SEPSIS: {
    id: 'sepsis',
    name: 'Sepsis Hour-1 Bundle',
    category: 'Emergency',
    steps: [
      'Measure lactate; re-measure if > 2 mmol/L',
      'Obtain blood cultures before antibiotics',
      'Administer broad-spectrum antibiotics',
      'Begin 30 mL/kg crystalloid for hypotension or lactate ≥ 4',
      'Apply vasopressors if hypotensive during or after fluid resuscitation',
    ],
    redFlags: ['MAP < 65 mmHg', 'Lactate > 4 mmol/L', 'Altered mental status'],
  },
  
  HYPERKALEMIA: {
    id: 'hyperkalemia',
    name: 'Hyperkalemia Emergency Protocol',
    category: 'Emergency',
    steps: [
      'ECG immediately',
      'Calcium gluconate 10% 10 mL IV over 2–3 min (cardiac stabilisation)',
      'Insulin 10 units + Dextrose 50% 50 mL IV (redistribution)',
      'Salbutamol 10–20 mg nebulised (redistribution)',
      'Sodium bicarbonate 8.4% 50 mL IV if acidotic',
      'Calcium resonium 15–30 g PO/PR (elimination)',
      'Urgent nephrology if K > 6.5 or ECG changes persist',
    ],
    ecgChanges: ['Peaked T waves', 'Widened QRS', 'Loss of P waves', 'Sine wave'],
  },
  
  DKA: {
    id: 'dka',
    name: 'DKA Management Protocol',
    category: 'Emergency',
    steps: [
      'IV normal saline 1 L/hr for first 2 hours',
      'Insulin infusion 0.1 units/kg/hr (do NOT bolus)',
      'Monitor glucose hourly, K+ every 2 hours',
      'Add dextrose when glucose < 14 mmol/L',
      'Replace potassium: add 40 mmol KCl/L if K < 5.5',
      'Monitor bicarbonate, anion gap, pH',
      'Transition to SC insulin when anion gap closes and patient eating',
    ],
    resolutionCriteria: ['pH > 7.3', 'Bicarbonate > 18 mmol/L', 'Anion gap < 12', 'Patient eating'],
  },
  
  HYPOGLYCEMIA: {
    id: 'hypoglycemia',
    name: 'Hypoglycemia Protocol',
    category: 'Emergency',
    steps: [
      'Confirm glucose < 4 mmol/L',
      'If conscious: 15-20g fast-acting glucose (juice, glucose tabs)',
      'If altered/unable to swallow: Glucagon 1mg IM or Dextrose 50% 25mL IV',
      'Recheck glucose in 15 minutes',
      'Repeat treatment if glucose still < 4 mmol/L',
      'Give long-acting carbohydrate once recovered',
      'Investigate cause',
    ],
    causes: ['Insulin overdose', 'Missed meal', 'Sulfonylurea', 'Alcohol', 'Adrenal insufficiency'],
  },
  
  ACUTE_CHEST_PAIN: {
    id: 'chest_pain',
    name: 'Acute Chest Pain Protocol',
    category: 'Cardiac',
    steps: [
      'ECG within 10 minutes',
      'Aspirin 300mg (if no contraindication)',
      'IV access and bloods (Troponin, FBC, U&E, Glucose)',
      'Oxygen if SpO2 < 94%',
      'GTN sublingual if BP > 90 systolic',
      'Morphine 2.5-5mg IV for pain',
      'Serial ECGs and troponins at 0, 3, 6 hours',
    ],
    stemiCriteria: ['ST elevation ≥ 1mm in 2 contiguous leads', 'New LBBB'],
  },
  
  STROKE: {
    id: 'stroke',
    name: 'Acute Stroke Protocol',
    category: 'Neurological',
    steps: [
      'Note time of symptom onset',
      'NIHSS score assessment',
      'CT head immediately (rule out hemorrhage)',
      'Blood glucose, FBC, coagulation',
      'If ischemic and < 4.5 hours: consider thrombolysis',
      'Blood pressure management per protocol',
      'Swallow assessment before oral intake',
      'DVT prophylaxis after 24 hours',
    ],
    thrombolysisContraindications: ['Hemorrhage on CT', 'BP > 185/110', 'INR > 1.7', 'Recent surgery', 'Active bleeding'],
  },
  
  ANAPHYLAXIS: {
    id: 'anaphylaxis',
    name: 'Anaphylaxis Protocol',
    category: 'Emergency',
    steps: [
      'Remove trigger if possible',
      'Call for help',
      'Adrenaline 0.5mg IM (0.5mL of 1:1000) mid-outer thigh',
      'High-flow oxygen',
      'IV fluid bolus 500mL-1L crystalloid',
      'Repeat adrenaline every 5 minutes if no improvement',
      'Consider IV adrenaline infusion if refractory',
      'Hydrocortisone 200mg IV and chlorphenamine 10mg IV',
    ],
    features: ['Airway compromise', 'Breathing difficulty', 'Circulation (hypotension)', 'Skin changes'],
  },
  
  AKI: {
    id: 'aki',
    name: 'Acute Kidney Injury Management',
    category: 'Renal',
    steps: [
      'Assess fluid status (JVP, peripheral oedema)',
      'Review medications (stop nephrotoxins)',
      'Urinalysis and urine microscopy',
      'Renal USS if obstruction suspected',
      'Fluid challenge if hypovolaemic (250-500mL)',
      'Monitor strict fluid balance',
      'Daily U&E monitoring',
      'Consider nephrology referral if AKI stage 3',
    ],
    nephrotoxins: ['NSAIDs', 'ACEi/ARB', 'Aminoglycosides', 'Contrast', 'Metformin'],
  },
  
  GI_BLEED: {
    id: 'gi_bleed',
    name: 'GI Bleeding Protocol',
    category: 'GI',
    steps: [
      'Large bore IV access x2',
      'Group & save, crossmatch 4 units',
      'Bloods: FBC, U&E, LFTs, coagulation',
      'Calculate Glasgow-Blatchford score',
      'IV PPI (omeprazole 80mg bolus)',
      'Resuscitate with crystalloid, transfuse if Hb < 70 g/L',
      'Correct coagulopathy (FFP, vitamin K)',
      'Urgent endoscopy if unstable',
    ],
    blatchfordScore: 'Score ≥ 6 indicates need for intervention',
  },
};

// Clinical Scores (for calculator)
export const CLINICAL_SCORES = {
  CURB65: {
    id: 'curb65',
    name: 'CURB-65',
    fullName: 'CURB-65 Pneumonia Severity Score',
    criteria: [
      { id: 'confusion', label: 'Confusion (new disorientation)', points: 1 },
      { id: 'urea', label: 'Urea > 7 mmol/L', points: 1 },
      { id: 'rr', label: 'Respiratory rate ≥ 30/min', points: 1 },
      { id: 'bp', label: 'BP: Systolic < 90 or Diastolic ≤ 60 mmHg', points: 1 },
      { id: 'age', label: 'Age ≥ 65 years', points: 1 },
    ],
    interpretation: [
      { range: [0, 1], risk: 'Low', mortality: '< 3%', action: 'Consider home treatment' },
      { range: [2, 2], risk: 'Moderate', mortality: '9%', action: 'Hospital admission' },
      { range: [3, 5], risk: 'High', mortality: '15-40%', action: 'ICU consideration' },
    ],
  },
  
  qSOFA: {
    id: 'qsofa',
    name: 'qSOFA',
    fullName: 'Quick Sequential Organ Failure Assessment',
    criteria: [
      { id: 'rr', label: 'Respiratory rate ≥ 22/min', points: 1 },
      { id: 'gcs', label: 'Altered mental status (GCS < 15)', points: 1 },
      { id: 'sbp', label: 'Systolic BP ≤ 100 mmHg', points: 1 },
    ],
    interpretation: [
      { range: [0, 1], risk: 'Low', action: 'Continue monitoring' },
      { range: [2, 3], risk: 'High', action: 'Investigate for sepsis, consider ICU' },
    ],
  },
  
  WELLS_PE: {
    id: 'wells_pe',
    name: 'Wells Score (PE)',
    fullName: 'Wells Criteria for Pulmonary Embolism',
    criteria: [
      { id: 'dvt', label: 'Clinical signs/symptoms of DVT', points: 3 },
      { id: 'alternate', label: 'PE is most likely diagnosis', points: 3 },
      { id: 'hr', label: 'Heart rate > 100 bpm', points: 1.5 },
      { id: 'immobilization', label: 'Immobilization ≥ 3 days or surgery in past 4 weeks', points: 1.5 },
      { id: 'previous', label: 'Previous DVT/PE', points: 1.5 },
      { id: 'hemoptysis', label: 'Hemoptysis', points: 1 },
      { id: 'malignancy', label: 'Malignancy (active or treatment within 6 months)', points: 1 },
    ],
    interpretation: [
      { range: [0, 1], risk: 'Low', probability: '< 2%' },
      { range: [2, 6], risk: 'Moderate', probability: '20%' },
      { range: [6.5, 12.5], risk: 'High', probability: '> 50%' },
    ],
  },
  
  CHA2DS2_VASc: {
    id: 'cha2ds2_vasc',
    name: 'CHA₂DS₂-VASc',
    fullName: 'CHA₂DS₂-VASc Score for AF Stroke Risk',
    criteria: [
      { id: 'chf', label: 'Congestive heart failure', points: 1 },
      { id: 'htn', label: 'Hypertension', points: 1 },
      { id: 'age75', label: 'Age ≥ 75 years', points: 2 },
      { id: 'diabetes', label: 'Diabetes mellitus', points: 1 },
      { id: 'stroke', label: 'Stroke/TIA/thromboembolism', points: 2 },
      { id: 'vascular', label: 'Vascular disease (MI, PAD, aortic plaque)', points: 1 },
      { id: 'age65', label: 'Age 65-74 years', points: 1 },
      { id: 'female', label: 'Female sex', points: 1 },
    ],
    interpretation: [
      { range: [0, 0], risk: 'Low', action: 'No anticoagulation' },
      { range: [1, 1], risk: 'Moderate', action: 'Consider anticoagulation' },
      { range: [2, 9], risk: 'High', action: 'Anticoagulation recommended' },
    ],
  },
  
  GCS: {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    fullName: 'Glasgow Coma Scale',
    categories: [
      {
        name: 'Eye Opening',
        options: [
          { label: 'Spontaneous', points: 4 },
          { label: 'To voice', points: 3 },
          { label: 'To pain', points: 2 },
          { label: 'None', points: 1 },
        ],
      },
      {
        name: 'Verbal Response',
        options: [
          { label: 'Oriented', points: 5 },
          { label: 'Confused', points: 4 },
          { label: 'Inappropriate words', points: 3 },
          { label: 'Incomprehensible sounds', points: 2 },
          { label: 'None', points: 1 },
        ],
      },
      {
        name: 'Motor Response',
        options: [
          { label: 'Obeys commands', points: 6 },
          { label: 'Localises pain', points: 5 },
          { label: 'Withdraws from pain', points: 4 },
          { label: 'Abnormal flexion', points: 3 },
          { label: 'Extension', points: 2 },
          { label: 'None', points: 1 },
        ],
      },
    ],
    interpretation: [
      { range: [3, 8], severity: 'Severe', action: 'Airway protection needed' },
      { range: [9, 12], severity: 'Moderate', action: 'Close monitoring' },
      { range: [13, 15], severity: 'Mild', action: 'Standard observation' },
    ],
  },
};

/**
 * Get lab value status (high, low, normal, critical)
 */
export function getLabStatus(testName, value) {
  const ref = REFERENCE_RANGES[testName];
  if (!ref) return { status: 'unknown', label: 'Unknown' };
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return { status: 'unknown', label: 'Invalid' };
  
  if (ref.criticalLow !== undefined && numValue < ref.criticalLow) {
    return { status: 'critical-low', label: 'Critical Low' };
  }
  if (ref.criticalHigh !== undefined && numValue > ref.criticalHigh) {
    return { status: 'critical-high', label: 'Critical High' };
  }
  if (numValue < ref.low) {
    return { status: 'low', label: 'Low' };
  }
  if (numValue > ref.high) {
    return { status: 'high', label: 'High' };
  }
  return { status: 'normal', label: 'Normal' };
}

/**
 * Format lab value with unit
 */
export function formatLabValue(testName, value) {
  const ref = REFERENCE_RANGES[testName];
  if (!ref) return `${value}`;
  return `${value} ${ref.unit}`;
}

/**
 * Get reference range string
 */
export function getReferenceRangeString(testName) {
  const ref = REFERENCE_RANGES[testName];
  if (!ref) return '';
  return `${ref.low}–${ref.high} ${ref.unit}`;
}
