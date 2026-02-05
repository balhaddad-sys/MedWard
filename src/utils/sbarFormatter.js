export function formatSBARLocally(patient, labs = [], meds = []) {
  const vitals = patient.lastVitals;
  const vitalsStr = vitals
    ? `BP ${vitals.bp}, HR ${vitals.hr}, RR ${vitals.rr}, Temp ${vitals.temp}°C, SpO2 ${vitals.spo2}% ${vitals.o2Delivery || 'RA'}`
    : 'No vitals recorded';

  const labStr = labs.length > 0
    ? labs.slice(0, 10).map((l) => `${l.testName}: ${l.value} ${l.unit || ''}`).join(', ')
    : 'No recent labs';

  const medStr = meds.length > 0
    ? meds.map((m) => `${m.name} ${m.dose} ${m.route} ${m.frequency}`).join(', ')
    : 'No active medications';

  return `## S — Situation
${patient.name}, ${patient.ageSex}, ${patient.diagnosis}, Day ${patient.dayOfAdmission || '?'} on ${patient.ward}.
Status: ${patient.currentStatus}

## B — Background
Admitted with ${patient.diagnosis}. File: ${patient.fileNumber || 'N/A'}.

## A — Assessment
Vitals: ${vitalsStr}
Recent Labs: ${labStr}
Alerts: ${(patient.activeAlerts || []).join(', ') || 'None'}

## R — Recommendation
1. Review pending results
2. Continue current management
3. Reassess if status changes

## Active Medications
${medStr}

---
*Generated ${new Date().toISOString().slice(0, 16)} — Educational reference only.*`;
}
