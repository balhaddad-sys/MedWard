/**
 * Order Set Types (Phase 4)
 *
 * Pre-built order set templates for common clinical scenarios
 * Enables one-tap batch task creation
 */

import type { TaskCategory, TaskPriority } from './task';

export type OrderSetCategory =
  | 'cardiac'
  | 'respiratory'
  | 'metabolic'
  | 'infectious'
  | 'neurological'
  | 'renal'
  | 'gastrointestinal'
  | 'other';

export interface OrderSetItem {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  timing: 'STAT' | '1hr' | '4hr' | '24hr' | 'routine'; // When the task should be done
  isPreChecked: boolean; // Auto-selected as critical item
  notes?: string;
}

export interface ClinicalSource {
  name: string;       // e.g., "NICE CG95"
  url: string;        // Direct link to guideline
  publisher: string;  // e.g., "NICE", "UpToDate", "Medscape"
}

export interface OrderSet {
  id: string;
  name: string;
  category: OrderSetCategory;
  description: string;
  icon: string; // Emoji or icon identifier
  color: string; // Tailwind color class
  items: OrderSetItem[];
  estimatedDuration: string; // e.g., "2-4 hours"
  clinicalGuideline?: string; // Short reference name
  sources?: ClinicalSource[]; // Verified clinical references
}
