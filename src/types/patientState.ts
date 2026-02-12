/**
 * Patient State Management Types
 *
 * Defines patient lifecycle states and state transition tracking
 * for production-grade patient flow management
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Patient lifecycle states
 *
 * - incoming: New admission being clerked (Clerking mode)
 * - active: Stable inpatient on ward (Ward mode)
 * - unstable: Requires immediate attention (Acute/On-Call mode)
 * - ready_dc: Ready for discharge
 * - discharged: No longer in hospital
 */
export type PatientState =
  | 'incoming'
  | 'active'
  | 'unstable'
  | 'ready_dc'
  | 'discharged';

/**
 * Patient modification for audit trail
 * Tracks all changes to patient data for medico-legal compliance
 */
export interface PatientModification {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'state_change' | 'delete';
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * State transition validation result
 */
export interface StateTransitionResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Valid state transitions matrix
 * Defines which state transitions are allowed
 */
export const ALLOWED_STATE_TRANSITIONS: Record<PatientState, PatientState[]> = {
  incoming: ['active', 'unstable', 'discharged'], // Clerked patient can go to ward, on-call, or discharged
  active: ['unstable', 'ready_dc', 'discharged'],   // Ward patient can deteriorate, improve, or discharge
  unstable: ['active', 'ready_dc', 'discharged'],   // Unstable patient can stabilize, improve, or discharge
  ready_dc: ['active', 'discharged'],               // Ready for discharge can wait or discharge
  discharged: [],                                    // Discharged is terminal state
};

/**
 * State display metadata
 */
export const STATE_METADATA: Record<PatientState, { label: string; color: string; description: string }> = {
  incoming: {
    label: 'New Admission',
    color: 'blue',
    description: 'Patient being clerked, awaiting full assessment',
  },
  active: {
    label: 'Ward Patient',
    color: 'green',
    description: 'Stable patient on ward receiving routine care',
  },
  unstable: {
    label: 'Acute/On-Call',
    color: 'red',
    description: 'Requires immediate clinical attention',
  },
  ready_dc: {
    label: 'Ready for Discharge',
    color: 'yellow',
    description: 'Medically fit for discharge, awaiting arrangements',
  },
  discharged: {
    label: 'Discharged',
    color: 'gray',
    description: 'No longer in hospital',
  },
};
