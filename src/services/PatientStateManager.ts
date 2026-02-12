/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Patient State Manager (Phase 0)
 *
 * Centralized service for managing patient state transitions
 * with validation and audit trail
 */

import { Timestamp } from 'firebase/firestore';
import type { Patient } from '@/types/patient';
import type { PatientState, StateTransitionResult } from '@/types/patientState';
import { ALLOWED_STATE_TRANSITIONS } from '@/types/patientState';
import { updatePatient } from './firebase/patients';

export class PatientStateManager {
  /**
   * Validate if a state transition is allowed
   */
  static validateTransition(
    currentState: PatientState,
    newState: PatientState
  ): StateTransitionResult {
    const allowedTransitions = ALLOWED_STATE_TRANSITIONS[currentState];

    if (!allowedTransitions.includes(newState)) {
      return {
        allowed: false,
        reason: `Cannot transition from "${currentState}" to "${newState}"`,
      };
    }

    // Additional business logic validations
    const warnings: string[] = [];

    // Warn if discharging unstable patient
    if (currentState === 'unstable' && newState === 'discharged') {
      warnings.push('Discharging an unstable patient - ensure clinical review');
    }

    // Warn if marking ready for discharge from incoming
    if (currentState === 'incoming' && newState === 'ready_dc') {
      warnings.push('Patient not yet admitted to ward - unusual discharge path');
    }

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Transition patient to new state with validation and audit
   */
  static async transitionState(
    patientId: string,
    newState: PatientState,
    userId: string,
    userName: string,
    currentPatient: Patient
  ): Promise<StateTransitionResult> {
    // Validate transition
    const validation = this.validateTransition(currentPatient.state, newState);
    if (!validation.allowed) {
      return validation;
    }

    // Create modification record for audit trail
    const modification = {
      id: `${Date.now()}-state-change`,
      timestamp: Timestamp.now(),
      userId,
      userName,
      action: 'state_change' as const,
      field: 'state',
      oldValue: currentPatient.state,
      newValue: newState,
    };

    // Update patient
    await updatePatient(patientId, {
      state: newState,
      stateChangedAt: Timestamp.now(),
      stateChangedBy: userId,
      modificationHistory: [
        ...(currentPatient.modificationHistory || []),
        modification,
      ],
      lastModifiedBy: userId,
    } as any);

    return {
      allowed: true,
      warnings: validation.warnings,
    };
  }

  /**
   * Get recommended next states for a patient
   */
  static getRecommendedStates(currentState: PatientState): PatientState[] {
    return ALLOWED_STATE_TRANSITIONS[currentState];
  }
}
