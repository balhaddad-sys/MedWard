/**
 * Patient State Manager (Phase 0)
 *
 * Centralized service for managing patient state transitions
 * with validation and audit trail. Uses Firestore transactions
 * to prevent race conditions on concurrent state changes.
 */

import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Patient } from '@/types/patient';
import type { PatientState, StateTransitionResult } from '@/types/patientState';
import { ALLOWED_STATE_TRANSITIONS } from '@/types/patientState';

export class PatientStateManager {
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

    const warnings: string[] = [];

    if (currentState === 'unstable' && newState === 'discharged') {
      warnings.push('Discharging an unstable patient - ensure clinical review');
    }

    if (currentState === 'incoming' && newState === 'ready_dc') {
      warnings.push('Patient not yet admitted to ward - unusual discharge path');
    }

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  static async transitionState(
    patientId: string,
    newState: PatientState,
    userId: string,
    userName: string,
    _currentPatient: Patient
  ): Promise<StateTransitionResult> {
    // Pre-validate with the client-side snapshot for fast feedback
    const preCheck = this.validateTransition(_currentPatient.state, newState);
    if (!preCheck.allowed) {
      return preCheck;
    }

    const patientRef = doc(db, 'patients', patientId);

    // Use a Firestore transaction to atomically read-then-write,
    // preventing race conditions when two transitions fire concurrently.
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(patientRef);
      if (!snap.exists()) {
        return { allowed: false, reason: 'Patient not found' };
      }

      const liveState = snap.data().state as PatientState;
      const validation = this.validateTransition(liveState, newState);
      if (!validation.allowed) {
        return validation;
      }

      const modification = {
        id: `${Date.now()}-state-change`,
        timestamp: Timestamp.now(),
        userId,
        userName,
        action: 'state_change' as const,
        field: 'state',
        oldValue: liveState,
        newValue: newState,
      };

      const existingHistory = snap.data().modificationHistory || [];

      transaction.update(patientRef, {
        state: newState,
        stateChangedAt: Timestamp.now(),
        stateChangedBy: userId,
        modificationHistory: [...existingHistory, modification],
        lastModifiedBy: userId,
      });

      return {
        allowed: true,
        warnings: validation.warnings,
      };
    });
  }

  static getRecommendedStates(currentState: PatientState): PatientState[] {
    return ALLOWED_STATE_TRANSITIONS[currentState];
  }
}
