export function calculateGFR(creatinine, age, sex) {
  // CKD-EPI 2021 equation (race-free)
  const isFemale = sex?.toLowerCase() === 'f';
  const k = isFemale ? 0.7 : 0.9;
  const a = isFemale ? -0.241 : -0.302;
  const min = Math.min(creatinine / 88.4 / k, 1);
  const max = Math.max(creatinine / 88.4 / k, 1);
  return 142 * Math.pow(min, a) * Math.pow(max, -1.2) * Math.pow(0.9938, age);
}

export function getRenalAlert(gfr) {
  if (gfr === null || gfr === undefined) return null;
  if (gfr < 15) return { level: 'critical', message: 'SEVERE RENAL FAILURE (GFR < 15). Nephrology referral. Avoid nephrotoxins.' };
  if (gfr < 30) return { level: 'critical', message: `SEVERE RENAL IMPAIRMENT (GFR ${Math.round(gfr)}). Dose adjustment required for ALL renally cleared drugs.` };
  if (gfr < 60) return { level: 'warning', message: `MODERATE RENAL IMPAIRMENT (GFR ${Math.round(gfr)}). Check drug doses and monitor levels.` };
  return null;
}

export const RENAL_ADJUST_DRUGS = [
  'Gentamicin', 'Vancomycin', 'Metformin', 'Enoxaparin', 'Acyclovir',
  'Amoxicillin', 'Ciprofloxacin', 'Meropenem', 'Piperacillin-Tazobactam',
  'Digoxin', 'Lithium', 'Gabapentin', 'Pregabalin', 'Allopurinol',
];
