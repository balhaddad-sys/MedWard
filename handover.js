/**
 * MedWard Pro — Handover Summary
 * Generates structured clinical handover summaries
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateHandover } = require('../helpers/validators');

const generateHandoverSummary = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  const { patients } = validateHandover(request.data);

  const system = buildMedicalSystemPrompt(
    'a senior ward physician preparing a clinical handover',
    `INSTRUCTIONS:
- Generate a concise, structured handover summary using SBAR format
- Prioritize patients by acuity: Critical → Guarded → Stable
- For each patient include:
  * Situation: One-line summary (name, age, diagnosis, day of admission)
  * Background: Key history, allergies, relevant investigations
  * Assessment: Current status, recent changes, outstanding issues
  * Recommendation: Active plan, pending results, escalation triggers
- Highlight any safety concerns or time-sensitive tasks
- Flag patients requiring overnight review or monitoring
- Include pending investigations and expected results
- Note any family/social issues requiring attention
- Keep language concise and action-oriented`
  );

  // Format patient data
  const patientSummaries = patients.map((p, i) => {
    let summary = `Patient ${i + 1}: ${p.name || 'Unknown'}, ${p.age || '?'}${p.sex || ''}, Bed ${p.bed || '?'}`;
    summary += `\nDiagnosis: ${p.diagnosis || 'Not specified'}`;
    summary += `\nStatus: ${p.status || 'Unknown'}`;
    if (p.vitals) {
      const v = p.vitals;
      summary += `\nVitals: HR ${v.hr || '?'}, BP ${v.bp || '?'}, Temp ${v.temp || '?'}°C, RR ${v.rr || '?'}, SpO2 ${v.spo2 || '?'}%`;
    }
    if (p.notes) summary += `\nNotes: ${p.notes}`;
    if (p.medications && p.medications.length > 0) {
      summary += `\nMedications: ${p.medications.map(m => m.name || m).join(', ')}`;
    }
    return summary;
  }).join('\n\n---\n\n');

  const response = await callClaude({
    system,
    messages: [{
      role: 'user',
      content: `Generate a handover summary for the following ${patients.length} patients:\n\n${patientSummaries}`,
    }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.handover,
  });

  return { response, patientCount: patients.length, timestamp: Date.now() };
});

module.exports = { generateHandoverSummary };
