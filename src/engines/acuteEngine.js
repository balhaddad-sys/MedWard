// Acute Engine — Real-time clinical calculations

export function calcMAP(systolic, diastolic) {
  if (!systolic && systolic !== 0) return { valid: false, message: 'Enter SBP' };
  if (!diastolic && diastolic !== 0) return { valid: false, message: 'Enter DBP' };

  const sys = Number(systolic);
  const dia = Number(diastolic);

  if (isNaN(sys) || isNaN(dia)) return { valid: false, message: 'Invalid BP values' };
  if (dia > sys) return { valid: false, message: 'Check BP values (DBP > SBP)' };
  if (sys <= 0 || dia <= 0) return { valid: false, message: 'Enter valid BP' };

  const map = (sys + 2 * dia) / 3;
  return {
    valid: true,
    value: Math.round(map),
    status: map >= 65 ? 'acceptable' : 'critical',
  };
}

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

export function calcFluidBolus(weightKg) {
  if (!weightKg || weightKg <= 0) return { valid: false, message: 'Enter weight in kg' };
  const volume = Math.round(Number(weightKg) * 30);
  return {
    valid: true,
    volumeML: volume,
    suggestion: `${volume} mL over 15-30 min (reassess after)`,
  };
}

export function calcCorrectedCalcium(totalCa, albumin) {
  if (!totalCa || !albumin) return { valid: false };
  const corrected = Number(totalCa) + (4 - Number(albumin)) * 0.8;
  return {
    valid: true,
    value: corrected.toFixed(1),
    status: corrected < 8.5 ? 'LOW' : corrected > 10.2 ? 'HIGH' : 'NORMAL',
  };
}

export function calcAnionGap(na, cl, hco3) {
  if (!na || !cl || !hco3) return { valid: false };
  const gap = Number(na) - (Number(cl) + Number(hco3));
  return {
    valid: true,
    value: Math.round(gap),
    status: gap > 12 ? 'ELEVATED' : 'NORMAL',
  };
}

export function calcCorrectedNa(measuredNa, glucose) {
  if (!measuredNa || !glucose) return { valid: false };
  const corrected = Number(measuredNa) + 1.6 * ((Number(glucose) - 100) / 100);
  return {
    valid: true,
    value: corrected.toFixed(1),
    status: corrected < 135 ? 'LOW' : corrected > 145 ? 'HIGH' : 'NORMAL',
  };
}
