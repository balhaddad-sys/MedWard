/**
 * Clerking Mode Type Definitions
 * Complete data model for structured clinical clerking workflow
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CORE CLERKING STRUCTURES
// ============================================================================

export type ClerkingStatus = 'draft' | 'signed' | 'amended';
export type SectionStatus = 'incomplete' | 'warning' | 'complete';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type PlanItemType = 'monitoring' | 'fluid' | 'medication' | 'investigation' | 'consult' | 'task';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// ============================================================================
// HISTORY SECTION
// ============================================================================

export interface SystemReview {
  cardiovascular: string;
  respiratory: string;
  gastrointestinal: string;
  genitourinary: string;
  neurological: string;
  musculoskeletal: string;
  dermatological: string;
  constitutional: string;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  indication?: string;
  isHighRisk?: boolean; // anticoagulants, insulin, opioids, steroids
}

export interface Allergy {
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  type: 'drug' | 'food' | 'environmental' | 'other';
}

export interface HistoryData {
  presentingComplaint: string;
  historyOfPresentingIllness: string;
  systemsReview: Partial<SystemReview>;
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: Medication[];
  allergies: Allergy[];
  familyHistory: string;
  socialHistory: {
    occupation?: string;
    smoking?: string;
    alcohol?: string;
    illicitDrugs?: string;
    living?: string;
    functionalStatus?: string;
  };
  codeStatus?: string;
  escalationPlan?: string;
}

// ============================================================================
// EXAMINATION SECTION
// ============================================================================

export interface VitalSigns {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painScore?: number;
  supplementalO2?: string;
  timestamp: Date | Timestamp;
}

export interface ExaminationSystem {
  findings: string;
  isNormal: boolean;
  abnormalDetails?: string;
}

export interface ExaminationData {
  general: {
    appearance: string;
    distress: boolean;
    hydration: string;
    pallor: boolean;
    jaundice: boolean;
    cyanosis: boolean;
  };
  gcs?: number;
  orientation?: string;
  vitals: VitalSigns;
  cardiovascular: ExaminationSystem;
  respiratory: ExaminationSystem;
  abdominal: ExaminationSystem;
  neurological: ExaminationSystem;
  musculoskeletal: ExaminationSystem;
  skin: ExaminationSystem;
}

// ============================================================================
// INVESTIGATIONS SECTION
// ============================================================================

export interface LabTest {
  name: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  isCritical?: boolean;
  timestamp: Date | Timestamp;
  interpretation?: string;
}

export interface LabPanel {
  panelName: string;
  tests: LabTest[];
  collectedAt: Date | Timestamp;
  resultedAt?: Date | Timestamp;
  status: 'pending' | 'partial' | 'complete';
}

export interface ImagingStudy {
  modality: 'CXR' | 'CT' | 'MRI' | 'US' | 'XR' | 'other';
  bodyPart: string;
  indication: string;
  requestTime: Date | Timestamp;
  resultTime?: Date | Timestamp;
  impression: string;
  clinicalInterpretation?: string;
  imageUrl?: string;
}

export interface MicrobiologyResult {
  specimen: string;
  collectedAt: Date | Timestamp;
  resultedAt?: Date | Timestamp;
  organism?: string;
  sensitivities?: Array<{ antibiotic: string; result: 'S' | 'I' | 'R' }>;
  status: 'pending' | 'preliminary' | 'final';
}

export interface InvestigationsData {
  labs: LabPanel[];
  imaging: ImagingStudy[];
  microbiology: MicrobiologyResult[];
  pendingResults: string[];
}

// ============================================================================
// ASSESSMENT & PROBLEM LIST
// ============================================================================

export interface ProblemListItem {
  id: string;
  title: string;
  evidence: string[]; // References to symptoms, labs, imaging
  severity: Priority;
  plan: string[];
  tasks: string[]; // IDs of linked tasks
  isActive: boolean;
  resolvedAt?: Date | Timestamp;
}

// ============================================================================
// PLAN SECTION
// ============================================================================

export interface PlanItem {
  id: string;
  type: PlanItemType;
  description: string;
  status: TaskStatus;
  priority?: Priority;
  dueTime?: Date | Timestamp;
  assignedTo?: string;
  notes?: string;
  createdAt: Date | Timestamp;
  completedAt?: Date | Timestamp;
}

export interface MonitoringPlan {
  vitalsFrequency: string; // e.g., "q4h", "continuous"
  neuroObservations: boolean;
  fluidBalance: boolean;
  urineOutput: boolean;
  escalationTriggers: string[];
}

export interface FluidPlan {
  maintenance?: string;
  restriction?: string;
  bolusLogic?: string;
}

export interface ConsultRequest {
  specialty: string;
  reason: string;
  contactNumber?: string;
  timeCalled?: Date | Timestamp;
  response?: string;
  status: 'pending' | 'responded' | 'seen';
}

export interface PlanData {
  monitoring: MonitoringPlan;
  fluids: FluidPlan;
  medications: PlanItem[];
  investigations: PlanItem[];
  consults: ConsultRequest[];
  tasks: PlanItem[];
}

// ============================================================================
// SAFETY & RED FLAGS
// ============================================================================

export interface SafetyChecklist {
  vteProph: { considered: boolean; reason?: string };
  giProph: { indicated: boolean; given?: boolean };
  linesReview: { done: boolean; notes?: string };
  pressureInjury: { risk: 'low' | 'medium' | 'high'; prevention?: string };
  fallsRisk: { risk: 'low' | 'medium' | 'high'; prevention?: string };
  sepsisSix: { applicable: boolean; completed?: boolean };
  other: string[];
}

// ============================================================================
// AI SUGGESTIONS STRUCTURE
// ============================================================================

export interface AISuggestion {
  differentialDiagnosis: string[];
  redFlagsToExclude: string[];
  suggestedInvestigations: Array<{
    test: string;
    reason: string;
    priority: 'urgent' | 'routine';
  }>;
  managementPearls: string[];
  timestamp: Date | Timestamp;
}

// ============================================================================
// MAIN CLERKING NOTE DOCUMENT
// ============================================================================

export interface ClerkingNote {
  // Identity
  id: string;
  patientId: string;
  authorId: string;
  authorName: string;

  // Status
  status: ClerkingStatus;
  startedAt: Date | Timestamp;
  savedAt?: Date | Timestamp;
  signedAt?: Date | Timestamp;

  // Basic Info
  location: string; // Ward/Room/Bed
  workingDiagnosis: string;
  diagnosisKeywords: string[]; // For AI triggering
  presentingComplaint: string;

  // Structured Content
  history: Partial<HistoryData>;
  examination: Partial<ExaminationData>;
  investigations: Partial<InvestigationsData>;
  problemList: ProblemListItem[];
  plan: Partial<PlanData>;
  safety: Partial<SafetyChecklist>;

  // Section Completion Tracking
  sectionStatus: {
    history: SectionStatus;
    examination: SectionStatus;
    investigations: SectionStatus;
    assessment: SectionStatus;
    plan: SectionStatus;
    safety: SectionStatus;
  };

  // AI Integration
  aiSuggestions?: AISuggestion;

  // Output
  sbarText?: string;
  handoverText?: string;

  // Metadata
  completionPercentage: number;
  lastAutoSaveAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// ============================================================================
// ON-CALL LIST INTEGRATION
// ============================================================================

/**
 * REMOVED: OnCallSnapshot (Phase 0 - denormalized data)
 * Patient data is now referenced via patientId only
 * Fetch from patients collection on read instead of duplicating
 */

/**
 * OnCallListEntry - Reference-only architecture (Phase 0)
 * Stores only reference to patient, not full snapshot
 * This prevents data sync issues and maintains single source of truth
 */
export interface OnCallListEntry {
  id: string;
  patientId: string; // Reference to patient (was snapshot object)
  priority: Priority;
  addedAt: Date | Timestamp; // When added to on-call list
  addedBy: string; // User ID who added
  notes?: string; // Clinician notes about this on-call patient
  escalationFlags: string[]; // Active concerns/escalations
  lastReviewedAt?: Date | Timestamp; // Last time reviewed
  isActive: boolean;
  createdAt: Date | Timestamp; // Legacy field for compatibility
  updatedAt: Date | Timestamp; // Legacy field for compatibility
}

// ============================================================================
// DRAFT PERSISTENCE (LocalStorage)
// ============================================================================

export interface ClerkingDraft {
  noteId: string;
  patientId?: string;
  data: Partial<ClerkingNote>;
  lastModified: number; // timestamp
  version: number; // For conflict resolution
}

// ============================================================================
// CLINICAL TEMPLATES
// ============================================================================

export interface ClinicalTemplate {
  id: string;
  name: string;
  specialty?: string;
  diagnosis?: string;
  redFlags: string[];
  examFocus: string[];
  investigations: string[];
  managementPearls: string[];
}

// Default template definitions
export const CLINICAL_TEMPLATES: Record<string, ClinicalTemplate> = {
  default: {
    id: 'default',
    name: 'General Medical',
    redFlags: ['Hypotension', 'Hypoxia', 'Altered consciousness', 'Chest pain', 'Severe bleeding'],
    examFocus: ['General appearance', 'Vital signs', 'System-specific exam'],
    investigations: ['CBC', 'U&E', 'LFTs', 'CRP', 'CXR', 'ECG'],
    managementPearls: ['ABC approach', 'Treat reversible causes', 'Escalate early if concerned'],
  },
  neuro_stroke: {
    id: 'neuro_stroke',
    name: 'Ischemic Stroke',
    specialty: 'Neurology',
    diagnosis: 'stroke',
    redFlags: [
      'Last known well > 4.5hrs?',
      'Anticoagulated?',
      'Recent surgery?',
      'Hemorrhagic transformation risk?',
      'Large vessel occlusion?',
    ],
    examFocus: ['NIHSS Score', 'Pupils', 'Power assessment', 'Speech', 'Gag reflex', 'Swallow safety'],
    investigations: ['CT Brain non-contrast', 'CTA head/neck', 'ECG', 'Echo', 'Lipids', 'HbA1c'],
    managementPearls: [
      'Thrombolysis window: 4.5hrs from LKW',
      'Thrombectomy window: up to 24hrs in selected cases',
      'Aspirin 300mg if no thrombolysis',
      'Early rehab referral',
      'Driving: DVLA notification',
    ],
  },
  cardio_acs: {
    id: 'cardio_acs',
    name: 'Acute Coronary Syndrome',
    specialty: 'Cardiology',
    diagnosis: 'acs|mi|stemi|nstemi',
    redFlags: [
      'ST elevation?',
      'Hemodynamic instability?',
      'Heart failure signs?',
      'Cardiogenic shock?',
      'Mechanical complications?',
    ],
    examFocus: ['Heart sounds (murmurs?)', 'JVP', 'Lung crackles', 'Peripheral edema', 'Peripheral pulses'],
    investigations: [
      'Serial troponins (0h, 3h)',
      'ECG (serial)',
      'CXR',
      'Echo',
      'Coronary angiogram if STEMI',
      'Lipids',
    ],
    managementPearls: [
      'MONA: Morphine, O2, Nitrates, Aspirin',
      'Dual antiplatelet: Aspirin + Ticagrelor/Clopidogrel',
      'Anticoagulation: Fondaparinux or LMWH',
      'STEMI: Immediate cath lab activation',
      'GRACE score for risk stratification',
    ],
  },
  resp_pneumonia: {
    id: 'resp_pneumonia',
    name: 'Community-Acquired Pneumonia',
    specialty: 'Respiratory',
    diagnosis: 'pneumonia|cap',
    redFlags: ['Hypoxia', 'Septic shock', 'Multilobar involvement', 'Pleural effusion', 'Immunocompromised'],
    examFocus: ['Work of breathing', 'Oxygen requirement', 'Chest auscultation', 'Percussion', 'Confusion (CURB-65)'],
    investigations: ['CXR', 'Blood cultures', 'Sputum culture', 'ABG/VBG', 'Inflammatory markers', 'Viral PCR'],
    managementPearls: [
      'CURB-65 score for severity',
      'Empirical antibiotics within 4hrs: Co-amoxiclav + Clarithromycin',
      'Sepsis 6 if septic',
      'Review antibiotics at 48-72hrs based on cultures',
      'Repeat CXR at 6 weeks to ensure resolution',
    ],
  },
};

// Utility: Match diagnosis to template
export function matchTemplate(diagnosis: string): ClinicalTemplate {
  const lowerDiagnosis = diagnosis.toLowerCase();

  for (const template of Object.values(CLINICAL_TEMPLATES)) {
    if (template.diagnosis && lowerDiagnosis.includes(template.diagnosis)) {
      return template;
    }
  }

  return CLINICAL_TEMPLATES.default;
}
