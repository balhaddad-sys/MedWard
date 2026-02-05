/**
 * MedWard Pro — Electrolyte Correction
 * Calculates and verifies electrolyte correction protocols
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateElectrolyteCorrection } = require('../helpers/validators');

const verifyElectrolyteCorrection = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  const { electrolyte, currentValue, targetValue, weight, context } = validateElectrolyteCorrection(request.data);

  const system = buildMedicalSystemPrompt(
    'an internal medicine specialist verifying electrolyte correction',
    `INSTRUCTIONS:
- Calculate the appropriate correction protocol for the given electrolyte abnormality
- Include: Deficit calculation, replacement protocol, route, rate, monitoring frequency
- Provide specific fluid/medication orders with exact doses
- Flag rate-of-correction safety limits (e.g., Na correction <10 mEq/24h for hyponatremia)
- Include monitoring schedule (when to recheck)
- Note potential complications of correction (e.g., osmotic demyelination, rebound)
- Consider renal function impact on correction
- Mention concurrent electrolyte considerations (e.g., Mg with K)
- Use standard IV formulations available in Kuwait hospitals`
  );

  let userMessage = `Electrolyte: ${electrolyte}
Current value: ${currentValue}
Target value: ${targetValue}`;
  if (weight) userMessage += `\nPatient weight: ${weight} kg`;
  if (context) userMessage += `\nClinical context: ${context}`;
  userMessage += '\n\nPlease calculate the correction protocol and verify safety parameters.';

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.electrolyte,
  });

  return { response, electrolyte, currentValue, targetValue, timestamp: Date.now() };
});

module.exports = { verifyElectrolyteCorrection };
