/**
 * SBAR Generator (Phase 5)
 *
 * Auto-generates structured SBAR handover from patient data, tasks, and labs
 * Highlights risk flags: code status, allergies, critical labs, overnight tasks, isolation
 */

import type { Patient } from '@/types';
import type { Task } from '@/types/task';
import type { LabPanel } from '@/types';

export interface RiskFlag {
  id: string;
  category: 'code-status' | 'allergy' | 'critical-lab' | 'overnight-task' | 'isolation' | 'other';
  severity: 'critical' | 'high' | 'medium';
  label: string;
  details: string;
}

export interface SBAR {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  riskFlags: RiskFlag[];
  generatedAt: Date;
}

export class SBARGenerator {
  /**
   * Generate SBAR from patient, tasks, and labs
   */
  static generate(
    patient: Patient,
    tasks: Task[] = [],
    labs: LabPanel[] = []
  ): SBAR {
    const riskFlags = this.detectRiskFlags(patient, tasks, labs);

    return {
      situation: this.generateSituation(patient),
      background: this.generateBackground(patient),
      assessment: this.generateAssessment(patient, labs),
      recommendation: this.generateRecommendation(patient, tasks),
      riskFlags,
      generatedAt: new Date(),
    };
  }

  /**
   * Format SBAR for clipboard copy
   */
  static formatForCopy(sbar: SBAR, patientName: string): string {
    const sections: string[] = [];

    // Header with risk flags
    sections.push(`========================================`);
    sections.push(`SBAR HANDOVER: ${patientName}`);
    sections.push(`Generated: ${sbar.generatedAt.toLocaleString()}`);
    sections.push(`========================================`);
    sections.push('');

    // Risk Flags (if any)
    if (sbar.riskFlags.length > 0) {
      sections.push('⚠️ RISK FLAGS:');
      sbar.riskFlags.forEach((flag) => {
        sections.push(`  • ${flag.label}: ${flag.details}`);
      });
      sections.push('');
    }

    // SBAR Sections
    sections.push('SITUATION:');
    sections.push(sbar.situation);
    sections.push('');

    sections.push('BACKGROUND:');
    sections.push(sbar.background);
    sections.push('');

    sections.push('ASSESSMENT:');
    sections.push(sbar.assessment);
    sections.push('');

    sections.push('RECOMMENDATION:');
    sections.push(sbar.recommendation);
    sections.push('');

    sections.push(`========================================`);

    return sections.join('\n');
  }

  /**
   * Detect risk flags from patient data
   */
  private static detectRiskFlags(
    patient: Patient,
    tasks: Task[],
    labs: LabPanel[]
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // Code status (if not full)
    if (patient.codeStatus && patient.codeStatus !== 'full') {
      flags.push({
        id: 'code-status',
        category: 'code-status',
        severity: 'critical',
        label: 'Code Status',
        details: patient.codeStatus.toUpperCase(),
      });
    }

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      flags.push({
        id: 'allergies',
        category: 'allergy',
        severity: 'critical',
        label: 'Allergies',
        details: patient.allergies.join(', '),
      });
    }

    // Critical labs
    const criticalLabs = labs.filter((lab) =>
      lab.values?.some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
    );
    if (criticalLabs.length > 0) {
      const criticalValues = criticalLabs
        .flatMap((lab) => lab.values?.filter((v) => v.flag === 'critical_low' || v.flag === 'critical_high') || [])
        .map((v) => `${v.name}: ${v.value}${v.unit}`)
        .slice(0, 3);

      flags.push({
        id: 'critical-labs',
        category: 'critical-lab',
        severity: 'critical',
        label: 'Critical Labs',
        details: criticalValues.join(', '),
      });
    }

    // Overnight tasks (pending tasks due within 12 hours)
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const overnightTasks = tasks.filter((task) => {
      if (task.status !== 'pending' || !task.dueAt) return false;
      const dueDate =
        typeof task.dueAt === 'object' && 'toDate' in task.dueAt
          ? task.dueAt.toDate()
          : new Date(task.dueAt);
      return dueDate <= twelveHoursFromNow;
    });

    if (overnightTasks.length > 0) {
      flags.push({
        id: 'overnight-tasks',
        category: 'overnight-task',
        severity: 'high',
        label: 'Overnight Tasks',
        details: `${overnightTasks.length} pending task(s) due tonight`,
      });
    }

    // High acuity
    if (patient.acuity && patient.acuity <= 2) {
      flags.push({
        id: 'high-acuity',
        category: 'other',
        severity: 'high',
        label: 'High Acuity',
        details: `Acuity Level ${patient.acuity}`,
      });
    }

    return flags;
  }

  /**
   * Generate Situation section
   */
  private static generateSituation(patient: Patient): string {
    const age = patient.dateOfBirth
      ? this.calculateAge(patient.dateOfBirth)
      : 'unknown age';
    const gender = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'Other';

    return `${age}y ${gender}, ${patient.bedNumber ? `Bed ${patient.bedNumber}, ` : ''}admitted with ${patient.primaryDiagnosis || 'condition under investigation'}. Acuity level ${patient.acuity || 3}.`;
  }

  /**
   * Generate Background section
   */
  private static generateBackground(patient: Patient): string {
    const sections: string[] = [];

    // Diagnosis
    if (patient.diagnoses && patient.diagnoses.length > 0) {
      sections.push(`Diagnoses: ${patient.diagnoses.join(', ')}`);
    } else if (patient.primaryDiagnosis) {
      sections.push(`Working diagnosis: ${patient.primaryDiagnosis}`);
    }

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      sections.push(`⚠️ Allergies: ${patient.allergies.join(', ')}`);
    } else {
      sections.push(`No known drug allergies (NKDA)`);
    }

    // Team
    if (patient.team) {
      sections.push(`Team: ${patient.team}`);
    }
    if (patient.attendingPhysician) {
      sections.push(`Consultant: ${patient.attendingPhysician}`);
    }

    return sections.join('. ');
  }

  /**
   * Generate Assessment section
   */
  private static generateAssessment(patient: Patient, labs: LabPanel[]): string {
    const sections: string[] = [];

    // Current status
    sections.push(`Currently ${patient.state || 'stable'}`);

    // Critical labs
    const criticalLabs = labs.filter((lab) =>
      lab.values?.some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
    );
    if (criticalLabs.length > 0) {
      const criticalValues = criticalLabs
        .flatMap((lab) => lab.values?.filter((v) => v.flag === 'critical_low' || v.flag === 'critical_high') || [])
        .map((v) => `${v.name}: ${v.value}${v.unit}`)
        .slice(0, 5);
      sections.push(`⚠️ Critical results: ${criticalValues.join(', ')}`);
    }

    return sections.join('. ');
  }

  /**
   * Generate Recommendation section
   */
  private static generateRecommendation(patient: Patient, tasks: Task[]): string {
    const sections: string[] = [];

    // Pending tasks
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0) {
      const taskSummary = pendingTasks
        .slice(0, 5)
        .map((t) => t.title)
        .join('; ');
      sections.push(`Outstanding tasks: ${taskSummary}`);
      if (pendingTasks.length > 5) {
        sections.push(`(+${pendingTasks.length - 5} more)`);
      }
    }

    // Escalation plan
    const criticalTasks = tasks.filter(
      (t) => t.status === 'pending' && t.priority === 'critical'
    );
    if (criticalTasks.length > 0) {
      sections.push(
        `🚨 ${criticalTasks.length} critical task(s) require urgent attention`
      );
    }

    // Code status reminder
    if (patient.codeStatus && patient.codeStatus !== 'full') {
      sections.push(`⚠️ ${patient.codeStatus.toUpperCase()} - escalation plan agreed`);
    }

    return sections.join('. ') || 'Continue current management plan.';
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dob: string | Date): number {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
