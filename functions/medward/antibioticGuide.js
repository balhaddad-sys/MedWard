/**
 * MedWard Pro — Antibiotic Guide
 * Evidence-based antibiotic selection guidance
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateAntibioticGuidance } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const getAntibioticGuidance = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'antibiotic');

  const { condition, context, allergies } = validateAntibioticGuidance(request.data);

  const system = buildMedicalSystemPrompt(
    'an infectious disease and antimicrobial stewardship advisor',
    `INSTRUCTIONS:
- Provide empirical antibiotic recommendations based on current guidelines
- Structure: First-line → Second-line → If Penicillin Allergy → Duration → Key Points
- Reference Sanford Guide, IDSA, NICE, and local antibiogram data
- Consider local resistance patterns (Kuwait/GCC context)
- Include dose, route, frequency, and duration
- Flag when cultures should be sent BEFORE starting antibiotics
- Mention de-escalation strategy
- Note when ID consultation is recommended
- Consider renal dose adjustments`
  );

  let userMessage = `Condition: ${condition}`;
  if (allergies.length > 0) {
    userMessage += `\nAllergies: ${allergies.join(', ')}`;
  }
  if (context) {
    userMessage += `\nClinical Context: ${context}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.antibiotic,
  });

  return { response, condition, timestamp: Date.now() };
});

module.exports = { getAntibioticGuidance };
