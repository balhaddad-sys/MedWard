/**
 * Clinical Mode Configuration
 * Defines capabilities, policies, and tools for each mode
 */

export const modeCapabilities = {
  ward: {
    name: 'Ward Mode',
    icon: '🏥',
    description: 'Daily rounds and patient management',
    allowedComponents: [
      'patientList',
      'taskPanel',
      'labsViewer',
      'notesEditor',
      'vitalsPanel',
      'medPanel',
    ],
    allowedTools: [
      'progressNoteGenerator',
      'labAnalyzer',
      'taskScheduler',
      'sbarGenerator',
      'medicationReconciliation',
    ],
    requiresPatientSelection: false,
    dangerousActions: ['prescribeHighRiskDrug', 'discharge'],
    displayDensity: 'compact',
    glanceHeaderShowsPatient: 'optional',
    toolScoringFunction: 'workflowRelevance',
    theme: {
      primary: '#0284c7',
      primaryLight: '#e0f2fe',
      primaryDark: '#0c4a6e',
      accent: '#0ea5e9',
    },
  },

  emergency: {
    name: 'Emergency Mode',
    icon: '🚨',
    description: 'Acute care and rapid protocols',
    allowedComponents: [
      'toolGrid',
      'vitalsMonitor',
      'redFlagScanner',
      'timerPanel',
      'quickLabs',
    ],
    allowedTools: [
      'sepsisProtocol',
      'aclsDosing',
      'rapidLabScan',
      'strokeTimer',
      'hyperkalemiaPathway',
      'codeBlueChecklist',
      'intubationChecklist',
      'bloodProductCalculator',
    ],
    requiresPatientSelection: 'guarded', // must explicitly choose
    dangerousActions: ['allActions'],
    displayDensity: 'minimal',
    glanceHeaderShowsPatient: 'mandatory',
    toolScoringFunction: 'timeToAction',
    theme: {
      primary: '#dc2626',
      primaryLight: '#fee2e2',
      primaryDark: '#7f1d1d',
      accent: '#ef4444',
    },
  },

  clinic: {
    name: 'Clinic Mode',
    icon: '👨‍⚕️',
    description: 'Outpatient care and longitudinal tracking',
    allowedComponents: [
      'scheduleView',
      'trendDeck',
      'patientEducation',
      'longitudinalData',
      'careTimeline',
    ],
    allowedTools: [
      'trendAnalyzer',
      'patientExplainer',
      'deepHistoryAnalysis',
      'counselingGuide',
      'preventiveCareChecklist',
      'referralHelper',
    ],
    requiresPatientSelection: true,
    dangerousActions: [],
    displayDensity: 'comfortable',
    glanceHeaderShowsPatient: 'mandatory',
    toolScoringFunction: 'contextRelevance',
    theme: {
      primary: '#059669',
      primaryLight: '#ecfdf5',
      primaryDark: '#064e3b',
      accent: '#10b981',
    },
  },
};

export const modePolicies = {
  ward: {
    confirmationRequired: ['discharge', 'criticalPrescribe', 'deletePatient'],
    phiExposureWarning: false,
    allowOfflineMode: true,
    allowBackgroundSync: true,
    autoSaveInterval: 30000, // 30 seconds
    maxPatientsDisplay: 20,
  },

  emergency: {
    confirmationRequired: ['allDangerousActions'],
    phiExposureWarning: true,
    allowOfflineMode: true,
    allowBackgroundSync: false,
    autoSaveInterval: 5000, // 5 seconds - more frequent
    maxToolsDisplay: 12,
  },

  clinic: {
    confirmationRequired: ['shareData', 'exportRecord', 'sendToPatient'],
    phiExposureWarning: true,
    allowOfflineMode: false,
    allowBackgroundSync: true,
    autoSaveInterval: 60000, // 60 seconds
    maxScheduleSlots: 20,
  },
};

export const clinicalTools = {
  // Emergency Tools
  sepsisProtocol: {
    id: 'sepsisProtocol',
    name: 'Sepsis Protocol',
    shortName: 'SEPSIS',
    icon: '🦠',
    mode: 'emergency',
    severity: 'critical',
    timeCritical: true,
    requiresPatient: true,
    requiresLabs: ['WBC', 'CRP', 'Lactate', 'Procalcitonin'],
    tags: ['infection', 'resuscitation', 'time-critical'],
    appliesTo: ['sepsis', 'septic shock', 'fever_with_hypotension', 'infection'],
    estimatedTime: '2 min',
    color: '#dc2626',
  },

  strokeTimer: {
    id: 'strokeTimer',
    name: 'Stroke Timer',
    shortName: 'STROKE',
    icon: '🧠',
    mode: 'emergency',
    severity: 'critical',
    timeCritical: true,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['neuro', 'time-critical', 'thrombolytics'],
    appliesTo: ['acute_stroke', 'neuro_symptoms_acute', 'tpa_candidate'],
    estimatedTime: '1 min',
    color: '#7c3aed',
  },

  aclsDosing: {
    id: 'aclsDosing',
    name: 'ACLS Dosing',
    shortName: 'ACLS',
    icon: '💓',
    mode: 'emergency',
    severity: 'critical',
    timeCritical: true,
    requiresPatient: false,
    requiresLabs: [],
    tags: ['cardiac', 'resuscitation', 'code'],
    appliesTo: ['cardiac_arrest', 'arrhythmia', 'code_blue'],
    estimatedTime: '30 sec',
    color: '#dc2626',
  },

  hyperkalemiaPathway: {
    id: 'hyperkalemiaPathway',
    name: 'Hyperkalemia Pathway',
    shortName: 'HIGH K+',
    icon: '⚡',
    mode: 'emergency',
    severity: 'critical',
    timeCritical: true,
    requiresPatient: true,
    requiresLabs: ['Potassium', 'Creatinine'],
    tags: ['electrolyte', 'cardiac', 'renal'],
    appliesTo: ['hyperkalemia', 'renal_failure', 'ecg_changes'],
    estimatedTime: '2 min',
    color: '#ea580c',
  },

  rapidLabScan: {
    id: 'rapidLabScan',
    name: 'Rapid Lab Scan',
    shortName: 'LABS',
    icon: '🔬',
    mode: 'emergency',
    severity: 'high',
    timeCritical: true,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['labs', 'screening', 'red-flags'],
    appliesTo: ['any'],
    estimatedTime: '1 min',
    color: '#0891b2',
  },

  codeBlueChecklist: {
    id: 'codeBlueChecklist',
    name: 'Code Blue Checklist',
    shortName: 'CODE',
    icon: '🚑',
    mode: 'emergency',
    severity: 'critical',
    timeCritical: true,
    requiresPatient: false,
    requiresLabs: [],
    tags: ['resuscitation', 'code', 'checklist'],
    appliesTo: ['cardiac_arrest', 'code_blue', 'unresponsive'],
    estimatedTime: '1 min',
    color: '#dc2626',
  },

  // Ward Tools
  progressNoteGenerator: {
    id: 'progressNoteGenerator',
    name: 'Progress Note',
    shortName: 'NOTE',
    icon: '📝',
    mode: 'ward',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: ['optional'],
    tags: ['documentation', 'summary', 'rounds'],
    appliesTo: ['daily_rounding', 'documentation'],
    estimatedTime: '30 sec',
    color: '#0284c7',
  },

  sbarGenerator: {
    id: 'sbarGenerator',
    name: 'SBAR Handover',
    shortName: 'SBAR',
    icon: '📋',
    mode: 'ward',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: ['optional'],
    tags: ['handover', 'communication', 'safety'],
    appliesTo: ['shift_change', 'handover', 'transfer'],
    estimatedTime: '1 min',
    color: '#0284c7',
  },

  taskScheduler: {
    id: 'taskScheduler',
    name: 'Task Manager',
    shortName: 'TASKS',
    icon: '✅',
    mode: 'ward',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: false,
    requiresLabs: [],
    tags: ['workflow', 'tasks', 'organization'],
    appliesTo: ['workflow'],
    estimatedTime: '30 sec',
    color: '#16a34a',
  },

  labAnalyzer: {
    id: 'labAnalyzer',
    name: 'Lab Analyzer',
    shortName: 'LABS',
    icon: '🧪',
    mode: 'ward',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['labs', 'trends', 'analysis'],
    appliesTo: ['lab_review'],
    estimatedTime: '1 min',
    color: '#7c3aed',
  },

  // Clinic Tools
  trendAnalyzer: {
    id: 'trendAnalyzer',
    name: 'Trend Analyzer',
    shortName: 'TRENDS',
    icon: '📈',
    mode: 'clinic',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['longitudinal', 'trends', 'analysis'],
    appliesTo: ['chronic_disease', 'follow_up'],
    estimatedTime: '2 min',
    color: '#059669',
  },

  patientExplainer: {
    id: 'patientExplainer',
    name: 'Patient Explainer',
    shortName: 'EXPLAIN',
    icon: '💬',
    mode: 'clinic',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['education', 'communication', 'patient-facing'],
    appliesTo: ['patient_education', 'counseling'],
    estimatedTime: '2 min',
    color: '#059669',
  },

  counselingGuide: {
    id: 'counselingGuide',
    name: 'Counseling Guide',
    shortName: 'COUNSEL',
    icon: '🗣️',
    mode: 'clinic',
    severity: 'routine',
    timeCritical: false,
    requiresPatient: true,
    requiresLabs: [],
    tags: ['counseling', 'communication', 'lifestyle'],
    appliesTo: ['lifestyle_modification', 'chronic_disease'],
    estimatedTime: '3 min',
    color: '#0891b2',
  },
};

/**
 * Get tools available for a specific mode
 */
export function getToolsForMode(mode) {
  return Object.values(clinicalTools).filter((tool) => tool.mode === mode);
}

/**
 * Get capabilities for a mode
 */
export function getCapabilities(mode) {
  return modeCapabilities[mode] || null;
}

/**
 * Get policies for a mode
 */
export function getPolicies(mode) {
  return modePolicies[mode] || null;
}

/**
 * Check if an action requires confirmation in a mode
 */
export function requiresConfirmation(mode, action) {
  const policies = modePolicies[mode];
  if (!policies) return false;

  if (policies.confirmationRequired.includes('allDangerousActions')) {
    return modeCapabilities[mode]?.dangerousActions.includes(action) || false;
  }

  return policies.confirmationRequired.includes(action);
}

export default {
  modeCapabilities,
  modePolicies,
  clinicalTools,
  getToolsForMode,
  getCapabilities,
  getPolicies,
  requiresConfirmation,
};
