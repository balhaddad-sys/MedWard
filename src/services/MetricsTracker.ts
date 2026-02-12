/**
 * Metrics Tracker (Phase 9)
 *
 * Auto-tracks performance metrics to validate adoption and improvements
 * Provides analytics dashboard data
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { PerformanceMetric, MetricSummary, MetricType } from '@/types/metrics';

const METRICS_COLLECTION = 'performance_metrics';

export class MetricsTracker {
  /**
   * Track a performance metric
   */
  static async track(params: {
    metricType: MetricType;
    value: number;
    userId: string;
    userName: string;
    patientId?: string;
    shiftType?: 'ward' | 'acute' | 'clerking';
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const metric: Omit<PerformanceMetric, 'id' | 'timestamp'> = {
      metricType: params.metricType,
      value: params.value,
      userId: params.userId,
      userName: params.userName,
      patientId: params.patientId,
      shiftType: params.shiftType,
      metadata: params.metadata,
      timestamp: serverTimestamp() as any,
    };

    try {
      const docRef = await addDoc(collection(db, METRICS_COLLECTION), metric);
      console.log(`📊 Metric tracked: ${params.metricType} = ${params.value}`);
      return docRef.id;
    } catch (error) {
      console.error('Failed to track metric:', error);
      throw error;
    }
  }

  /**
   * Track time-to-document (admission to signed note)
   */
  static async trackTimeToDocument(
    admissionTime: Date,
    signedTime: Date,
    userId: string,
    userName: string,
    patientId: string
  ): Promise<void> {
    const durationMinutes = (signedTime.getTime() - admissionTime.getTime()) / (1000 * 60);

    await this.track({
      metricType: 'time-to-document',
      value: Math.round(durationMinutes),
      userId,
      userName,
      patientId,
      metadata: {
        admissionTime: admissionTime.toISOString(),
        signedTime: signedTime.toISOString(),
      },
    });
  }

  /**
   * Track task completion time
   */
  static async trackTaskCompletion(
    taskCreatedAt: Date,
    taskCompletedAt: Date,
    userId: string,
    userName: string,
    patientId: string,
    taskPriority: string
  ): Promise<void> {
    const durationMinutes =
      (taskCompletedAt.getTime() - taskCreatedAt.getTime()) / (1000 * 60);

    await this.track({
      metricType: 'task-completion',
      value: Math.round(durationMinutes),
      userId,
      userName,
      patientId,
      metadata: {
        taskPriority,
        createdAt: taskCreatedAt.toISOString(),
        completedAt: taskCompletedAt.toISOString(),
      },
    });
  }

  /**
   * Track alert response time
   */
  static async trackAlertResponse(
    alertCreatedAt: Date,
    acknowledgedAt: Date,
    userId: string,
    userName: string,
    alertTier: string
  ): Promise<void> {
    const durationMinutes = (acknowledgedAt.getTime() - alertCreatedAt.getTime()) / (1000 * 60);

    await this.track({
      metricType: 'alert-response',
      value: Math.round(durationMinutes),
      userId,
      userName,
      metadata: {
        alertTier,
        createdAt: alertCreatedAt.toISOString(),
        acknowledgedAt: acknowledgedAt.toISOString(),
      },
    });
  }

  /**
   * Track handover completeness (% of SBAR fields populated)
   */
  static async trackHandoverCompleteness(
    sbar: { situation: string; background: string; assessment: string; recommendation: string },
    userId: string,
    userName: string,
    patientId: string
  ): Promise<void> {
    const fields = [sbar.situation, sbar.background, sbar.assessment, sbar.recommendation];
    const populatedFields = fields.filter((f) => f && f.trim().length > 0).length;
    const completenessPercent = (populatedFields / fields.length) * 100;

    await this.track({
      metricType: 'handover-completeness',
      value: Math.round(completenessPercent),
      userId,
      userName,
      patientId,
      metadata: {
        populatedFields,
        totalFields: fields.length,
      },
    });
  }

  /**
   * Get summary statistics for a metric over a period
   */
  static async getSummary(
    metricType: MetricType,
    period: '7d' | '30d' = '30d'
  ): Promise<MetricSummary> {
    const daysAgo = period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const q = query(
      collection(db, METRICS_COLLECTION),
      where('metricType', '==', metricType),
      where('timestamp', '>', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    const metrics = snapshot.docs.map((doc) => doc.data() as PerformanceMetric);

    if (metrics.length === 0) {
      return {
        metricType,
        count: 0,
        mean: 0,
        median: 0,
        p95: 0,
        min: 0,
        max: 0,
        trend: 'stable',
        period,
      };
    }

    // Calculate statistics
    const values = metrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / values.length;
    const median = values[Math.floor(values.length / 2)];
    const p95 = values[Math.floor(values.length * 0.95)];
    const min = values[0];
    const max = values[values.length - 1];

    // Calculate trend (compare first half vs second half of period)
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midpoint).map((m) => m.value);
    const secondHalf = metrics.slice(midpoint).map((m) => m.value);

    const firstHalfMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: 'improving' | 'stable' | 'declining';
    const change = ((secondHalfMean - firstHalfMean) / firstHalfMean) * 100;

    // For time metrics, lower is better (improving)
    // For completeness metrics, higher is better (improving)
    if (metricType === 'handover-completeness') {
      trend = change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable';
    } else {
      trend = change < -5 ? 'improving' : change > 5 ? 'declining' : 'stable';
    }

    return {
      metricType,
      count: metrics.length,
      mean: Math.round(mean),
      median,
      p95,
      min,
      max,
      trend,
      period,
    };
  }

  /**
   * Get all metric summaries
   */
  static async getAllSummaries(
    period: '7d' | '30d' = '30d'
  ): Promise<Record<MetricType, MetricSummary>> {
    const metricTypes: MetricType[] = [
      'time-to-document',
      'task-completion',
      'alert-response',
      'handover-completeness',
    ];

    const summaries = await Promise.all(
      metricTypes.map((type) => this.getSummary(type, period))
    );

    return summaries.reduce((acc, summary) => {
      acc[summary.metricType] = summary;
      return acc;
    }, {} as Record<MetricType, MetricSummary>);
  }
}
