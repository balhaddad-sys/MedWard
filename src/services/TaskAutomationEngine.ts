/**
 * Task Automation Engine (Phase 0.2)
 *
 * Auto-generates tasks from problem lists with clinical logic
 * Implements problem → task conversion for common scenarios
 */

import { Timestamp } from 'firebase/firestore';
import type { ProblemListItem } from '@/types/clerking';
import type { Task, TaskPriority, TaskCategory } from '@/types/task';

export class TaskAutomationEngine {
  /**
   * Generate tasks from a problem with clinical logic
   */
  static generateTasksFromProblem(
    problem: ProblemListItem,
    patientId: string,
    patientName: string,
    bedNumber: string,
    userId: string,
    userName: string
  ): Partial<Task>[] {
    const tasks: Partial<Task>[] = [];
    const problemLower = problem.title.toLowerCase();

    // Map problem severity to task priority
    const taskPriority: TaskPriority =
      problem.severity === 'critical' ? 'critical' :
      problem.severity === 'high' ? 'high' :
      problem.severity === 'medium' ? 'medium' : 'low';

    // Pneumonia protocol
    if (problemLower.includes('pneumonia')) {
      tasks.push(
        this.createTask({
          title: 'Blood cultures before antibiotics',
          description: 'Obtain 2 sets of blood cultures (peripheral + central if available) before starting antibiotics',
          category: 'lab',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Start empirical antibiotics',
          description: 'Initiate broad-spectrum antibiotics (e.g., Co-amoxiclav + Clarithromycin)',
          category: 'medication',
          priority: 'critical',
          dueInHours: 4,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Repeat CXR in 6 weeks',
          description: 'Follow-up chest X-ray to confirm resolution',
          category: 'imaging',
          priority: 'medium',
          dueInWeeks: 6,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // ACS / Chest Pain protocol
    if (problemLower.includes('acs') || problemLower.includes('chest pain') || problemLower.includes('mi')) {
      tasks.push(
        this.createTask({
          title: 'Serial troponins (0h, 3h)',
          description: 'High-sensitivity troponin at presentation and 3 hours',
          category: 'lab',
          priority: 'critical',
          dueInHours: 0.5,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'ECG (repeat if ongoing pain)',
          description: 'Serial ECGs every 30 minutes if ongoing chest pain',
          category: 'other',
          priority: 'critical',
          dueInHours: 0.5,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Cardiology review',
          description: 'Urgent cardiology consult if STEMI/NSTEMI confirmed',
          category: 'consult',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // Sepsis protocol
    if (problemLower.includes('sepsis')) {
      tasks.push(
        this.createTask({
          title: 'Sepsis Six - Blood cultures',
          description: '2 sets of blood cultures before antibiotics',
          category: 'lab',
          priority: 'critical',
          dueInHours: 0.5,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Sepsis Six - Lactate',
          description: 'Serum lactate measurement',
          category: 'lab',
          priority: 'critical',
          dueInHours: 0.5,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Sepsis Six - Antibiotics within 1hr',
          description: 'Broad-spectrum antibiotics (e.g., Tazocin 4.5g IV)',
          category: 'medication',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Sepsis Six - IV fluids',
          description: '500ml crystalloid bolus if hypotensive',
          category: 'medication',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // Hyperkalemia protocol
    if (problemLower.includes('hyperkalemia') || problemLower.includes('hyperkalaemia')) {
      tasks.push(
        this.createTask({
          title: 'Calcium gluconate 10% IV (if ECG changes)',
          description: 'Cardiac protection - 10ml of 10% calcium gluconate over 2-5 minutes',
          category: 'medication',
          priority: 'critical',
          dueInHours: 0.25,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Insulin-dextrose infusion',
          description: '10 units Actrapid in 50ml 50% dextrose over 15 minutes',
          category: 'medication',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Recheck K+ in 1 hour',
          description: 'Monitor potassium after treatment',
          category: 'lab',
          priority: 'high',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // DKA protocol
    if (problemLower.includes('dka') || problemLower.includes('diabetic ketoacidosis')) {
      tasks.push(
        this.createTask({
          title: 'DKA protocol - IV fluids',
          description: '0.9% saline 1L over 1 hour (adjust if heart failure risk)',
          category: 'medication',
          priority: 'critical',
          dueInHours: 0.5,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'DKA protocol - Fixed-rate insulin',
          description: '0.1 units/kg/hr IV insulin infusion',
          category: 'medication',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'DKA monitoring - Hourly BMs + ketones',
          description: 'Hourly blood glucose and ketone monitoring',
          category: 'nursing',
          priority: 'high',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // Stroke protocol
    if (problemLower.includes('stroke') || problemLower.includes('cva')) {
      tasks.push(
        this.createTask({
          title: 'CT head (urgent)',
          description: 'Non-contrast CT head within 1 hour of arrival',
          category: 'imaging',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Stroke team assessment',
          description: 'Urgent stroke team review for thrombolysis consideration',
          category: 'consult',
          priority: 'critical',
          dueInHours: 1,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );

      tasks.push(
        this.createTask({
          title: 'Swallow screen',
          description: 'Nil by mouth until swallow screen completed',
          category: 'nursing',
          priority: 'high',
          dueInHours: 4,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    // Generic high-priority problem tasks
    if (tasks.length === 0 && (problem.severity === 'high' || problem.severity === 'critical')) {
      tasks.push(
        this.createTask({
          title: `Monitor ${problem.title}`,
          description: `Regular monitoring and review of ${problem.title}`,
          category: 'nursing',
          priority: taskPriority,
          dueInHours: 4,
          patientId,
          patientName,
          bedNumber,
          userId,
          userName,
          problemId: problem.id,
        })
      );
    }

    return tasks;
  }

  /**
   * Helper to create a task with auto-generation metadata
   */
  private static createTask(config: {
    title: string;
    description: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueInHours?: number;
    dueInWeeks?: number;
    patientId: string;
    patientName: string;
    bedNumber: string;
    userId: string;
    userName: string;
    problemId: string;
  }): Partial<Task> {
    const now = new Date();
    let dueAt: Timestamp;

    if (config.dueInWeeks) {
      now.setDate(now.getDate() + config.dueInWeeks * 7);
      dueAt = Timestamp.fromDate(now);
    } else {
      const hours = config.dueInHours || 24;
      now.setHours(now.getHours() + hours);
      dueAt = Timestamp.fromDate(now);
    }

    return {
      patientId: config.patientId,
      patientName: config.patientName,
      bedNumber: config.bedNumber,
      title: config.title,
      description: config.description,
      category: config.category,
      priority: config.priority,
      status: 'pending',
      assignedTo: config.userId,
      assignedToName: config.userName,
      createdBy: config.userId,
      createdByName: config.userName,
      dueAt,
      generatedFrom: {
        type: 'problem',
        sourceId: config.problemId,
        autoGenerated: true,
      },
      escalationLevel: 'none',
      viewedBy: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }
}
