/**
 * MedWard Pro — Cloud Functions Entry Point
 * v9.0.0
 * 
 * Exports all callable functions for the MedWard Pro application
 */

const { initializeApp } = require('firebase-admin/app');
const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('./config');

// Initialize Firebase Admin
initializeApp();

// =============================================================================
// MedWard Functions — Clinical Decision Support
// =============================================================================
const { askClinical } = require('./medward/askClinical');
const { getDrugInfo } = require('./medward/drugInfo');
const { getAntibioticGuidance } = require('./medward/antibioticGuide');
const { analyzeLabImage, analyzeLabsWithClaude } = require('./medward/labAnalysis');
const { generateHandoverSummary } = require('./medward/handover');

// =============================================================================
// OnCall Functions — On-Call Support
// =============================================================================
const { askOnCall } = require('./oncall/askOnCall');
const { generateDifferential } = require('./oncall/differential');
const { verifyElectrolyteCorrection } = require('./oncall/electrolyteCorrection');

// =============================================================================
// Static Functions — Reference Data (no AI, no secrets)
// =============================================================================

/**
 * Get reference ranges for lab values
 */
const getReferenceRanges = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.static,
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  // Reference ranges in SI units (Kuwait standard)
  const ranges = {
    // Renal
    creatinine: { min: 62, max: 106, unit: 'µmol/L', name: 'Creatinine' },
    urea: { min: 2.5, max: 7.1, unit: 'mmol/L', name: 'Urea (BUN)' },
    eGFR: { min: 90, max: null, unit: 'mL/min/1.73m²', name: 'eGFR' },

    // Electrolytes
    sodium: { min: 136, max: 145, unit: 'mmol/L', name: 'Sodium' },
    potassium: { min: 3.5, max: 5.1, unit: 'mmol/L', name: 'Potassium' },
    chloride: { min: 98, max: 107, unit: 'mmol/L', name: 'Chloride' },
    bicarbonate: { min: 22, max: 29, unit: 'mmol/L', name: 'Bicarbonate' },
    calcium: { min: 2.15, max: 2.55, unit: 'mmol/L', name: 'Calcium' },
    phosphate: { min: 0.81, max: 1.45, unit: 'mmol/L', name: 'Phosphate' },
    magnesium: { min: 0.7, max: 1.0, unit: 'mmol/L', name: 'Magnesium' },

    // Hematology
    hemoglobin: { min: 120, max: 170, unit: 'g/L', name: 'Hemoglobin' },
    wbc: { min: 4.0, max: 11.0, unit: '×10⁹/L', name: 'WBC' },
    platelets: { min: 150, max: 400, unit: '×10⁹/L', name: 'Platelets' },
    hematocrit: { min: 0.36, max: 0.50, unit: 'L/L', name: 'Hematocrit' },
    mcv: { min: 80, max: 100, unit: 'fL', name: 'MCV' },
    mch: { min: 27, max: 33, unit: 'pg', name: 'MCH' },
    neutrophils: { min: 2.0, max: 7.5, unit: '×10⁹/L', name: 'Neutrophils' },
    lymphocytes: { min: 1.0, max: 4.0, unit: '×10⁹/L', name: 'Lymphocytes' },

    // Coagulation
    inr: { min: 0.9, max: 1.1, unit: '', name: 'INR' },
    pt: { min: 11, max: 13.5, unit: 'seconds', name: 'PT' },
    aptt: { min: 25, max: 35, unit: 'seconds', name: 'APTT' },
    fibrinogen: { min: 1.5, max: 4.0, unit: 'g/L', name: 'Fibrinogen' },
    dDimer: { min: 0, max: 0.5, unit: 'mg/L FEU', name: 'D-Dimer' },

    // Liver
    alt: { min: 0, max: 41, unit: 'U/L', name: 'ALT' },
    ast: { min: 0, max: 40, unit: 'U/L', name: 'AST' },
    alp: { min: 40, max: 130, unit: 'U/L', name: 'ALP' },
    ggt: { min: 0, max: 60, unit: 'U/L', name: 'GGT' },
    bilirubin: { min: 0, max: 21, unit: 'µmol/L', name: 'Total Bilirubin' },
    albumin: { min: 35, max: 50, unit: 'g/L', name: 'Albumin' },
    totalProtein: { min: 60, max: 80, unit: 'g/L', name: 'Total Protein' },

    // Cardiac
    troponin: { min: 0, max: 14, unit: 'ng/L', name: 'hs-Troponin' },
    bnp: { min: 0, max: 100, unit: 'pg/mL', name: 'BNP' },
    ntProBnp: { min: 0, max: 300, unit: 'pg/mL', name: 'NT-proBNP' },
    ck: { min: 30, max: 200, unit: 'U/L', name: 'CK' },
    ldh: { min: 120, max: 246, unit: 'U/L', name: 'LDH' },

    // Inflammatory
    crp: { min: 0, max: 5, unit: 'mg/L', name: 'CRP' },
    esr: { min: 0, max: 20, unit: 'mm/hr', name: 'ESR' },
    procalcitonin: { min: 0, max: 0.1, unit: 'ng/mL', name: 'Procalcitonin' },

    // Metabolic
    glucose: { min: 3.9, max: 5.6, unit: 'mmol/L', name: 'Fasting Glucose' },
    hba1c: { min: 20, max: 42, unit: 'mmol/mol', name: 'HbA1c' },
    lactate: { min: 0.5, max: 2.0, unit: 'mmol/L', name: 'Lactate' },

    // Thyroid
    tsh: { min: 0.4, max: 4.0, unit: 'mIU/L', name: 'TSH' },
    freeT4: { min: 12, max: 22, unit: 'pmol/L', name: 'Free T4' },
    freeT3: { min: 3.1, max: 6.8, unit: 'pmol/L', name: 'Free T3' },

    // ABG
    ph: { min: 7.35, max: 7.45, unit: '', name: 'pH' },
    pco2: { min: 4.7, max: 6.0, unit: 'kPa', name: 'pCO₂' },
    po2: { min: 10.0, max: 13.3, unit: 'kPa', name: 'pO₂' },
    baseExcess: { min: -2, max: 2, unit: 'mmol/L', name: 'Base Excess' },
  };

  // Filter by category if requested
  const category = request.data?.category;
  if (category) {
    const categories = {
      renal: ['creatinine', 'urea', 'eGFR'],
      electrolytes: ['sodium', 'potassium', 'chloride', 'bicarbonate', 'calcium', 'phosphate', 'magnesium'],
      hematology: ['hemoglobin', 'wbc', 'platelets', 'hematocrit', 'mcv', 'mch', 'neutrophils', 'lymphocytes'],
      coagulation: ['inr', 'pt', 'aptt', 'fibrinogen', 'dDimer'],
      liver: ['alt', 'ast', 'alp', 'ggt', 'bilirubin', 'albumin', 'totalProtein'],
      cardiac: ['troponin', 'bnp', 'ntProBnp', 'ck', 'ldh'],
      inflammatory: ['crp', 'esr', 'procalcitonin'],
      metabolic: ['glucose', 'hba1c', 'lactate'],
      thyroid: ['tsh', 'freeT4', 'freeT3'],
      abg: ['ph', 'pco2', 'po2', 'baseExcess'],
    };
    const keys = categories[category.toLowerCase()];
    if (keys) {
      const filtered = {};
      keys.forEach(k => { if (ranges[k]) filtered[k] = ranges[k]; });
      return { ranges: filtered, category };
    }
  }

  return { ranges };
});

/**
 * Get clinical protocol
 */
const getClinicalProtocol = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.static,
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const protocols = {
    sepsis: {
      name: 'Sepsis Bundle (Hour-1)',
      steps: [
        'Measure lactate level; remeasure if initial lactate >2 mmol/L',
        'Obtain blood cultures BEFORE administering antibiotics',
        'Administer broad-spectrum antibiotics within 1 hour',
        'Begin rapid administration of 30 mL/kg crystalloid for hypotension or lactate ≥4 mmol/L',
        'Apply vasopressors if hypotensive during/after fluid resuscitation (target MAP ≥65 mmHg)',
      ],
      source: 'Surviving Sepsis Campaign 2021',
    },
    aki: {
      name: 'AKI Management',
      steps: [
        'Assess volume status and optimize hemodynamics',
        'Review and stop nephrotoxic medications (NSAIDs, ACEi/ARBs, aminoglycosides)',
        'Urinalysis + microscopy, urine sodium, urine osmolality',
        'Renal USS if obstruction suspected',
        'Monitor UO (target >0.5 mL/kg/hr), daily U&E',
        'Consider nephrology referral if KDIGO Stage 3 or not improving',
      ],
      source: 'KDIGO 2012 Guidelines',
    },
    dka: {
      name: 'DKA Protocol',
      steps: [
        'IV access, bloods (glucose, U&E, VBG, ketones, FBC)',
        'Start 0.9% NaCl 1L over 1 hour (if SBP >90)',
        'Fixed-rate IV insulin: 0.1 units/kg/hr',
        'K+ replacement: add 40 mmol KCl to each bag if K+ <5.5',
        'Monitor hourly: glucose, ketones, VBG, U&E every 2-4 hours',
        'Target: glucose fall 3 mmol/L/hr, ketone fall 0.5 mmol/L/hr',
        'Switch to variable rate insulin + dextrose when glucose <14 mmol/L',
      ],
      source: 'Joint British Diabetes Societies',
    },
    chest_pain: {
      name: 'Acute Chest Pain Assessment',
      steps: [
        'ABCDE assessment, 12-lead ECG within 10 minutes',
        'If STEMI: activate cath lab, aspirin 300mg, GTN if SBP >90',
        'Bloods: hs-Troponin (0 and 3h), FBC, U&E, glucose, lipids',
        'If NSTEMI: aspirin + fondaparinux, GRACE score, cardiology referral',
        'Consider PE if pleuritic + tachycardic: CTPA, D-dimer',
        'Consider aortic dissection if tearing pain + BP differential',
        'CXR for all presentations',
      ],
      source: 'NICE CG95, ESC ACS Guidelines 2023',
    },
  };

  const protocolId = request.data?.protocolId;
  if (protocolId && protocols[protocolId]) {
    return { protocol: protocols[protocolId] };
  }

  // Return list of available protocols
  const available = Object.entries(protocols).map(([id, p]) => ({
    id,
    name: p.name,
    source: p.source,
  }));

  return { protocols: available };
});

// =============================================================================
// Export all functions
// =============================================================================
module.exports = {
  // MedWard
  askClinical,
  getDrugInfo,
  getAntibioticGuidance,
  analyzeLabImage,
  analyzeLabsWithClaude,
  generateHandoverSummary,

  // OnCall
  askOnCall,
  generateDifferential,
  verifyElectrolyteCorrection,

  // Static
  getReferenceRanges,
  getClinicalProtocol,
};
