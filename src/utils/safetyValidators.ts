/**
 * Safety Validators (Phase 1)
 *
 * Pre-submit validation layer to prevent unsafe patient/clinical data saves
 * Returns blockers (cannot save) vs warnings (can save with confirmation)
 */

import type { Patient, PatientFormData } from '@/types';
import type { ClerkingNote } from '@/types/clerking';

export type ValidationLevel = 'blocker' | 'warning';

export interface ValidationIssue {
  level: ValidationLevel;
  field: string;
  message: string;
  suggestedFix?: string;
}

export interface ValidationResult {
  isValid: boolean;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  canProceed: boolean; // true if no blockers (warnings are OK with confirmation)
}

/**
 * Validate patient safety before save
 * BLOCKERS: No MRN, no name, conflicting code status, missing critical fields
 */
export function validatePatientSafety(data: Partial<PatientFormData>): ValidationResult {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // BLOCKER: MRN is required
  if (!data.mrn || data.mrn.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'mrn',
      message: 'MRN (Medical Record Number) is required',
      suggestedFix: 'Enter a valid MRN before saving',
    });
  }

  // BLOCKER: First name is required
  if (!data.firstName || data.firstName.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'firstName',
      message: 'First name is required',
      suggestedFix: 'Enter patient first name',
    });
  }

  // BLOCKER: Last name is required
  if (!data.lastName || data.lastName.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'lastName',
      message: 'Last name is required',
      suggestedFix: 'Enter patient last name',
    });
  }

  // BLOCKER: Date of birth is required
  if (!data.dateOfBirth || data.dateOfBirth.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'dateOfBirth',
      message: 'Date of birth is required',
      suggestedFix: 'Enter patient date of birth',
    });
  }

  // BLOCKER: Primary diagnosis is required
  if (!data.primaryDiagnosis || data.primaryDiagnosis.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'primaryDiagnosis',
      message: 'Primary diagnosis is required',
      suggestedFix: 'Enter a working diagnosis before saving',
    });
  }

  // WARNING: Allergies not documented
  if (!data.allergies || data.allergies.length === 0) {
    warnings.push({
      level: 'warning',
      field: 'allergies',
      message: 'No allergies documented',
      suggestedFix: 'Document allergies or mark as "NKDA" (No Known Drug Allergies)',
    });
  }

  // WARNING: Code status not specified or is default
  if (!data.codeStatus || data.codeStatus === 'full') {
    warnings.push({
      level: 'warning',
      field: 'codeStatus',
      message: 'Code status not explicitly confirmed',
      suggestedFix: 'Confirm resuscitation status with patient/family',
    });
  }

  // WARNING: Bed number not assigned
  if (!data.bedNumber || data.bedNumber.trim() === '') {
    warnings.push({
      level: 'warning',
      field: 'bedNumber',
      message: 'Bed number not assigned',
      suggestedFix: 'Assign a bed location',
    });
  }

  // WARNING: Team not assigned
  if (!data.team || data.team.trim() === '') {
    warnings.push({
      level: 'warning',
      field: 'team',
      message: 'Team not assigned',
      suggestedFix: 'Assign to a clinical team',
    });
  }

  return {
    isValid: blockers.length === 0 && warnings.length === 0,
    blockers,
    warnings,
    canProceed: blockers.length === 0,
  };
}

/**
 * Validate clerking note before signing
 * BLOCKERS: Cannot sign without vitals, presenting complaint, problem list, plan
 */
export function validateClerkingNote(note: Partial<ClerkingNote>): ValidationResult {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // BLOCKER: Presenting complaint is required
  if (!note.presentingComplaint || note.presentingComplaint.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'presentingComplaint',
      message: 'Presenting complaint is required to sign note',
      suggestedFix: 'Document why the patient presented',
    });
  }

  // BLOCKER: Working diagnosis is required
  if (!note.workingDiagnosis || note.workingDiagnosis.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'workingDiagnosis',
      message: 'Working diagnosis is required to sign note',
      suggestedFix: 'Enter a working/differential diagnosis',
    });
  }

  // BLOCKER: Vitals must be documented
  if (
    !note.examination?.vitals ||
    !note.examination.vitals.heartRate ||
    !note.examination.vitals.bloodPressureSystolic
  ) {
    blockers.push({
      level: 'blocker',
      field: 'vitals',
      message: 'Vital signs are required to sign note',
      suggestedFix: 'Document at minimum: HR, BP, RR, Temp, SpO2',
    });
  }

  // BLOCKER: Problem list must have at least one active problem
  if (!note.problemList || note.problemList.filter((p) => p.isActive).length === 0) {
    blockers.push({
      level: 'blocker',
      field: 'problemList',
      message: 'At least one active problem is required',
      suggestedFix: 'Add problems to the problem list',
    });
  }

  // BLOCKER: Plan must be documented
  if (!note.plan || !note.plan.tasks || note.plan.tasks.length === 0) {
    blockers.push({
      level: 'blocker',
      field: 'plan',
      message: 'Management plan is required (at least one task)',
      suggestedFix: 'Document the management plan with tasks',
    });
  }

  // WARNING: History incomplete
  if (!note.history || !note.history.presentingComplaintDetails) {
    warnings.push({
      level: 'warning',
      field: 'history',
      message: 'History of presenting complaint not documented',
      suggestedFix: 'Document detailed history',
    });
  }

  // WARNING: Past medical history not documented
  if (
    !note.history?.pastMedicalHistory ||
    note.history.pastMedicalHistory.length === 0
  ) {
    warnings.push({
      level: 'warning',
      field: 'pastMedicalHistory',
      message: 'Past medical history not documented',
      suggestedFix: 'Document PMH or mark as "None"',
    });
  }

  // WARNING: Medications not documented
  if (!note.history?.medications || note.history.medications.length === 0) {
    warnings.push({
      level: 'warning',
      field: 'medications',
      message: 'Current medications not documented',
      suggestedFix: 'Document current medications or mark as "None"',
    });
  }

  // WARNING: Allergies not documented
  if (!note.history?.allergies || note.history.allergies.length === 0) {
    warnings.push({
      level: 'warning',
      field: 'allergies',
      message: 'Allergies not documented',
      suggestedFix: 'Document allergies or mark as "NKDA"',
    });
  }

  // WARNING: Safety checklist incomplete
  if (
    !note.safety?.deepVeinThrombosis ||
    note.safety.deepVeinThrombosis === 'not_assessed'
  ) {
    warnings.push({
      level: 'warning',
      field: 'safety.dvt',
      message: 'DVT prophylaxis not assessed',
      suggestedFix: 'Complete VTE risk assessment',
    });
  }

  return {
    isValid: blockers.length === 0 && warnings.length === 0,
    blockers,
    warnings,
    canProceed: blockers.length === 0,
  };
}

/**
 * Validate task before creation
 * BLOCKERS: Missing title, invalid priority, no patient assigned
 */
export function validateTask(data: {
  title?: string;
  priority?: string;
  patientId?: string;
  assignedTo?: string;
}): ValidationResult {
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!data.title || data.title.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'title',
      message: 'Task title is required',
      suggestedFix: 'Enter a task description',
    });
  }

  if (!data.priority || !['critical', 'high', 'medium', 'low'].includes(data.priority)) {
    blockers.push({
      level: 'blocker',
      field: 'priority',
      message: 'Valid priority is required',
      suggestedFix: 'Select a priority level',
    });
  }

  if (!data.patientId || data.patientId.trim() === '') {
    blockers.push({
      level: 'blocker',
      field: 'patientId',
      message: 'Patient must be assigned',
      suggestedFix: 'Assign task to a patient',
    });
  }

  if (!data.assignedTo || data.assignedTo.trim() === '') {
    warnings.push({
      level: 'warning',
      field: 'assignedTo',
      message: 'Task not assigned to a clinician',
      suggestedFix: 'Assign task to a team member',
    });
  }

  return {
    isValid: blockers.length === 0 && warnings.length === 0,
    blockers,
    warnings,
    canProceed: blockers.length === 0,
  };
}
