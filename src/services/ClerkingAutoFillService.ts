/**
 * Clerking Auto-Fill Service (Phase 3)
 *
 * Auto-fills investigations and safety checklist based on diagnosis keywords
 * Generates problem list from diagnosis + vitals
 */

import type { ProblemListItem } from '@/types/clerking';

export class ClerkingAutoFillService {
  /**
   * Auto-fill investigations based on diagnosis keywords
   */
  static autoFillInvestigations(diagnosisKeywords: string[]): {
    labs: string[];
    imaging: string[];
    other: string[];
  } {
    const labs: Set<string> = new Set();
    const imaging: Set<string> = new Set();
    const other: Set<string> = new Set();

    const diagnosisLower = diagnosisKeywords.map((k) => k.toLowerCase());

    // Pneumonia
    if (diagnosisLower.some((k) => k.includes('pneumonia') || k.includes('chest infection'))) {
      labs.add('FBC');
      labs.add('CRP');
      labs.add('U&Es');
      labs.add('Blood cultures (if pyrexial)');
      labs.add('Sputum culture');
      imaging.add('CXR PA + lateral');
      other.add('Oxygen saturations');
      other.add('CURB-65 score');
    }

    // ACS / Chest Pain / MI
    if (
      diagnosisLower.some(
        (k) =>
          k.includes('acs') ||
          k.includes('chest pain') ||
          k.includes('mi') ||
          k.includes('angina')
      )
    ) {
      labs.add('High-sensitivity troponin (0h, 3h)');
      labs.add('FBC');
      labs.add('U&Es');
      labs.add('Lipid profile');
      labs.add('HbA1c');
      imaging.add('ECG (repeat if ongoing pain)');
      imaging.add('CXR');
      other.add('Cardiology review if STEMI/NSTEMI');
    }

    // Sepsis
    if (diagnosisLower.some((k) => k.includes('sepsis') || k.includes('septic'))) {
      labs.add('Blood cultures (2 sets)');
      labs.add('Lactate');
      labs.add('FBC');
      labs.add('CRP');
      labs.add('U&Es');
      labs.add('LFTs');
      labs.add('Coagulation');
      labs.add('Urine culture');
      imaging.add('CXR');
      other.add('Sepsis Six protocol');
      other.add('IV antibiotics within 1 hour');
    }

    // DKA
    if (
      diagnosisLower.some((k) => k.includes('dka') || k.includes('diabetic ketoacidosis'))
    ) {
      labs.add('Capillary blood glucose');
      labs.add('Venous blood gas (pH, bicarbonate, ketones)');
      labs.add('U&Es');
      labs.add('Glucose');
      labs.add('HbA1c');
      imaging.add('ECG');
      other.add('DKA protocol - IV fluids + insulin');
      other.add('Hourly BMs + ketones');
    }

    // Hyperkalemia
    if (diagnosisLower.some((k) => k.includes('hyperkalemia') || k.includes('hyperkalaemia'))) {
      labs.add('U&Es (repeat)');
      labs.add('Venous blood gas');
      imaging.add('ECG');
      other.add('Calcium gluconate if ECG changes');
      other.add('Insulin-dextrose');
    }

    // Stroke / CVA
    if (diagnosisLower.some((k) => k.includes('stroke') || k.includes('cva') || k.includes('tia'))) {
      labs.add('FBC');
      labs.add('U&Es');
      labs.add('Glucose');
      labs.add('Lipid profile');
      labs.add('Coagulation');
      imaging.add('CT head (urgent <1hr)');
      imaging.add('CT angiography (if thrombolysis candidate)');
      other.add('Stroke team assessment');
      other.add('Swallow screen');
      other.add('NIHSS score');
    }

    // PE
    if (
      diagnosisLower.some((k) => k.includes('pe') || k.includes('pulmonary embolism') || k.includes('dvt'))
    ) {
      labs.add('D-dimer');
      labs.add('Troponin');
      labs.add('FBC');
      labs.add('U&Es');
      imaging.add('CTPA (if Wells score high or D-dimer positive)');
      imaging.add('CXR');
      imaging.add('ECG');
      other.add('Wells score');
      other.add('LMWH if high suspicion');
    }

    // AKI
    if (diagnosisLower.some((k) => k.includes('aki') || k.includes('acute kidney injury'))) {
      labs.add('U&Es (serial)');
      labs.add('FBC');
      labs.add('CRP');
      labs.add('Urinalysis + MC&S');
      labs.add('Urine protein:creatinine ratio');
      imaging.add('Renal ultrasound');
      other.add('Fluid balance chart');
      other.add('Review medications (stop nephrotoxins)');
    }

    // GI Bleed
    if (
      diagnosisLower.some(
        (k) => k.includes('gi bleed') || k.includes('haematemesis') || k.includes('melaena')
      )
    ) {
      labs.add('FBC');
      labs.add('U&Es');
      labs.add('LFTs');
      labs.add('Coagulation');
      labs.add('Group & Save');
      labs.add('Cross-match 2-4 units');
      other.add('Rockall score');
      other.add('IV PPI');
      other.add('Gastroscopy (urgent if haemodynamic instability)');
    }

    return {
      labs: Array.from(labs),
      imaging: Array.from(imaging),
      other: Array.from(other),
    };
  }

  /**
   * Auto-generate problem list from diagnosis + vitals
   */
  static generateProblemList(
    diagnosis: string,
    vitals?: {
      heartRate?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      temperature?: number;
      bloodPressureSystolic?: number;
    }
  ): Partial<ProblemListItem>[] {
    const problems: Partial<ProblemListItem>[] = [];

    // Primary diagnosis as first problem
    if (diagnosis && diagnosis !== 'Assessment pending') {
      problems.push({
        title: diagnosis,
        severity: 'high',
        isActive: true,
        evidence: ['Working diagnosis based on history and examination'],
      });
    }

    // Vitals-based problems
    if (vitals) {
      // Tachycardia
      if (vitals.heartRate && vitals.heartRate > 100) {
        problems.push({
          title: 'Tachycardia',
          severity: vitals.heartRate > 120 ? 'high' : 'medium',
          isActive: true,
          evidence: [`HR: ${vitals.heartRate} bpm`],
        });
      }

      // Hypoxia
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 94) {
        problems.push({
          title: 'Hypoxia',
          severity: vitals.oxygenSaturation < 90 ? 'critical' : 'high',
          isActive: true,
          evidence: [`SpO2: ${vitals.oxygenSaturation}%`],
        });
      }

      // Tachypnoea
      if (vitals.respiratoryRate && vitals.respiratoryRate > 20) {
        problems.push({
          title: 'Tachypnoea',
          severity: vitals.respiratoryRate > 25 ? 'high' : 'medium',
          isActive: true,
          evidence: [`RR: ${vitals.respiratoryRate} /min`],
        });
      }

      // Pyrexia
      if (vitals.temperature && vitals.temperature > 38.0) {
        problems.push({
          title: 'Pyrexia',
          severity: vitals.temperature > 39.0 ? 'high' : 'medium',
          isActive: true,
          evidence: [`Temperature: ${vitals.temperature}°C`],
        });
      }

      // Hypotension
      if (vitals.bloodPressureSystolic && vitals.bloodPressureSystolic < 90) {
        problems.push({
          title: 'Hypotension',
          severity: vitals.bloodPressureSystolic < 80 ? 'critical' : 'high',
          isActive: true,
          evidence: [`SBP: ${vitals.bloodPressureSystolic} mmHg`],
        });
      }

      // Hypertension
      if (vitals.bloodPressureSystolic && vitals.bloodPressureSystolic > 180) {
        problems.push({
          title: 'Hypertension',
          severity: vitals.bloodPressureSystolic > 200 ? 'high' : 'medium',
          isActive: true,
          evidence: [`SBP: ${vitals.bloodPressureSystolic} mmHg`],
        });
      }
    }

    return problems;
  }

  /**
   * Pre-fill safety checklist based on diagnosis
   */
  static autoFillSafetyChecklist(diagnosisKeywords: string[]): {
    dvtProphylaxis: boolean;
    fallsRisk: boolean;
    pressureUlcerRisk: boolean;
  } {
    const diagnosisLower = diagnosisKeywords.map((k) => k.toLowerCase());

    return {
      // DVT prophylaxis needed for most acute admissions unless contraindicated
      dvtProphylaxis: diagnosisLower.some(
        (k) =>
          k.includes('pneumonia') ||
          k.includes('sepsis') ||
          k.includes('stroke') ||
          k.includes('immobile')
      ),

      // Falls risk for elderly, stroke, confusion
      fallsRisk: diagnosisLower.some(
        (k) =>
          k.includes('stroke') ||
          k.includes('confusion') ||
          k.includes('delirium') ||
          k.includes('fall')
      ),

      // Pressure ulcer risk for immobile, stroke, sepsis
      pressureUlcerRisk: diagnosisLower.some(
        (k) =>
          k.includes('stroke') ||
          k.includes('sepsis') ||
          k.includes('immobile') ||
          k.includes('bed-bound')
      ),
    };
  }
}
