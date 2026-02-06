// ─── Acute Engine: Medical calculators with robust input validation ───────────
// Pure functions — no state, no side effects. Safe for testing.

const MAP_TARGET_DEFAULT = 65;

/**
 * Mean Arterial Pressure
 */
export function calcMAP(systolic, diastolic) {
  if (systolic === null || systolic === undefined || systolic === '' || systolic === 0) {
    return { valid: false, message: 'Enter SBP' };
  }
  if (diastolic === null || diastolic === undefined || diastolic === '' || diastolic === 0) {
    return { valid: false, message: 'Enter DBP' };
  }

  const sys = Number(systolic);
  const dia = Number(diastolic);

  if (isNaN(sys) || isNaN(dia)) return { valid: false, message: 'Invalid BP values' };
  if (dia > sys) return { valid: false, message: 'Check BP values (DBP > SBP)' };

  const map = (sys + 2 * dia) / 3;
  return {
    valid: true,
    value: Math.round(map),
    status: map >= MAP_TARGET_DEFAULT ? 'acceptable' : 'critical',
  };
}

/**
 * qSOFA Sepsis Screen
 */
export function calcQSOFA(rr22, ams, sbp100) {
  const score = [rr22, ams, sbp100].filter(Boolean).length;
  return {
    score,
    risk: score >= 2 ? 'HIGH' : 'LOW',
    recommendation:
      score >= 2
        ? 'Consider Sepsis: lactate, cultures, antibiotics (3h bundle), fluids'
        : null,
  };
}

/**
 * Fluid Bolus (30 mL/kg)
 */
export function calcFluidBolus(weightKg) {
  if (!weightKg || weightKg <= 0) return { valid: false, message: 'Enter weight in kg' };
  const volume = weightKg * 30;
  return {
    valid: true,
    volumeML: Math.round(volume),
    suggestion: `${Math.round(volume)} mL over 15–30 minutes (reassess after)`,
  };
}

/**
 * Corrected Calcium
 */
export function calcCorrectedCalcium(totalCa, albumin) {
  if (!totalCa || !albumin) return { valid: false, message: 'Enter Ca²⁺ and albumin' };
  const ca = Number(totalCa);
  const alb = Number(albumin);
  if (isNaN(ca) || isNaN(alb)) return { valid: false, message: 'Invalid values' };

  const corrected = ca + (4 - alb) * 0.8;
  return {
    valid: true,
    value: corrected.toFixed(1),
    status: corrected < 8.5 ? 'LOW' : corrected > 10.2 ? 'HIGH' : 'NORMAL',
  };
}

/**
 * GCS Quick Picker (Eye + Verbal + Motor)
 */
export function calcGCS(eye, verbal, motor) {
  const e = Number(eye) || 0;
  const v = Number(verbal) || 0;
  const m = Number(motor) || 0;
  const total = e + v + m;

  let severity = 'Mild';
  if (total <= 8) severity = 'Severe';
  else if (total <= 12) severity = 'Moderate';

  return { total, eye: e, verbal: v, motor: m, severity };
}

/**
 * Anion Gap
 */
export function calcAnionGap(na, cl, hco3) {
  if (!na || !cl || !hco3) return { valid: false, message: 'Enter Na⁺, Cl⁻, HCO₃⁻' };
  const gap = Number(na) - (Number(cl) + Number(hco3));
  return {
    valid: true,
    value: Math.round(gap),
    status: gap > 12 ? 'ELEVATED' : 'NORMAL',
  };
}

/**
 * Corrected Sodium (for hyperglycemia)
 */
export function calcCorrectedSodium(na, glucose) {
  if (!na || !glucose) return { valid: false, message: 'Enter Na⁺ and glucose' };
  // 1.6 mEq/L per 100 mg/dL glucose above 100
  const corrected = Number(na) + 1.6 * ((Number(glucose) - 100) / 100);
  return {
    valid: true,
    value: corrected.toFixed(1),
  };
}

/**
 * Creatinine Clearance (Cockcroft-Gault)
 */
export function calcCrCl(age, weight, creatinine, isFemale = false) {
  if (!age || !weight || !creatinine) return { valid: false, message: 'Enter age, weight, Cr' };
  let crcl = ((140 - Number(age)) * Number(weight)) / (72 * Number(creatinine));
  if (isFemale) crcl *= 0.85;
  return {
    valid: true,
    value: Math.round(crcl),
    unit: 'mL/min',
  };
}
