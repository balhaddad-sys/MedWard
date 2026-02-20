/**
 * Performance Metrics Types (Phase 9)
 *
 * Track adoption and performance metrics to validate improvements
 */

import type { Timestamp } from 'firebase/firestore';

export type MetricType =
  | 'time-to-document'    // Admission to signed note
  | 'task-completion'     // Task created to completed
  | 'alert-response'      // Alert to acknowledgment
  | 'handover-completeness'; // % of SBAR fields populated

export interface PerformanceMetric {
  id: string;
  metricType: MetricType;
  value: number; // In minutes for time metrics, % for completeness
  timestamp: Timestamp;
  userId: string;
  userName: string;
  patientId?: string;
  shiftType?: 'ward' | 'acute';
  metadata?: Record<string, unknown>;
}

export interface MetricSummary {
  metricType: MetricType;
  count: number;
  mean: number;
  median: number;
  p95: number; // 95th percentile
  min: number;
  max: number;
  trend: 'improving' | 'stable' | 'declining';
  period: '7d' | '30d';
}

export interface MetricTarget {
  metricType: MetricType;
  target: number;
  unit: string;
  description: string;
}

export const METRIC_TARGETS: MetricTarget[] = [
  {
    metricType: 'time-to-document',
    target: 10,
    unit: 'minutes',
    description: 'Admission to signed clerking note',
  },
  {
    metricType: 'task-completion',
    target: 240,
    unit: 'minutes',
    description: 'High-priority task completion time',
  },
  {
    metricType: 'alert-response',
    target: 5,
    unit: 'minutes',
    description: 'Critical alert acknowledgment time',
  },
  {
    metricType: 'handover-completeness',
    target: 90,
    unit: '%',
    description: 'SBAR fields populated',
  },
];
