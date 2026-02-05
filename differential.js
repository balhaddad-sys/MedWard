/**
 * MedWard Pro — Differential Diagnosis Generator
 * Generates ranked differential diagnoses from clinical presentation
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateDifferential } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const generateDifferential = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'differential');

  const { symptoms, history, vitals, age, sex } = validateDifferential(request.data);

  const system = buildMedicalSystemPrompt(
    'a diagnostic medicine specialist creating a differential diagnosis',
    `INSTRUCTIONS:
- Generate a ranked differential diagnosis (most likely first)
- For each diagnosis include: likelihood, key supporting features, key distinguishing features, initial workup
- Categorize as: Must Not Miss (life-threatening), Most Likely, Less Likely but Consider
- Include at least 5-8 differentials
- Flag any "cannot miss" diagnoses prominently
- Suggest initial investigations to narrow the differential
- Note if any presentations require immediate management before diagnosis is confirmed
- Consider epidemiology relevant to Kuwait/GCC region`
  );

  let userMessage = `Presenting symptoms: ${symptoms}`;
  if (age) userMessage += `\nAge: ${age}`;
  if (sex) userMessage += `\nSex: ${sex}`;
  if (history) userMessage += `\nRelevant history: ${history}`;
  if (vitals) {
    const v = vitals;
    userMessage += `\nVitals: ${[
      v.hr && `HR ${v.hr}`,
      v.bp && `BP ${v.bp}`,
      v.temp && `Temp ${v.temp}°C`,
      v.rr && `RR ${v.rr}`,
      v.spo2 && `SpO2 ${v.spo2}%`,
    ].filter(Boolean).join(', ')}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.differential,
  });

  return { response, timestamp: Date.now() };
});

module.exports = { generateDifferential };
