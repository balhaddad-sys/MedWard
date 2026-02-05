/**
 * MedWard Pro — On-Call Assistant
 * Guides junior doctors through on-call clinical scenarios
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateOnCall } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const askOnCall = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'onCall');

  const { scenario, context, urgency } = validateOnCall(request.data);

  const urgencyInstructions = {
    emergency: 'This is an EMERGENCY. Prioritize immediate life-saving interventions. Use A-B-C-D-E approach.',
    urgent: 'This is URGENT. Provide timely assessment and management within 30 minutes.',
    routine: 'This is ROUTINE. Provide systematic assessment and management.',
  };

  const system = buildMedicalSystemPrompt(
    'a senior registrar guiding a junior doctor on-call',
    `INSTRUCTIONS:
- ${urgencyInstructions[urgency]}
- Provide step-by-step guidance for the clinical scenario
- Structure: Immediate Actions → Assessment → Investigations → Management → Escalation Criteria
- Include specific orders (fluids, medications with doses, monitoring frequency)
- Flag when to call the senior/registrar/consultant
- Consider common on-call scenarios: falls, chest pain, SOB, acute confusion, hypotension, fever, electrolyte abnormalities
- Give practical, actionable advice suitable for a ward setting
- Note documentation requirements`
  );

  let userMessage = `On-call scenario (${urgency.toUpperCase()}): ${scenario}`;
  if (context) {
    userMessage += `\nAdditional context: ${context}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.onCall,
  });

  return { response, urgency, timestamp: Date.now() };
});

module.exports = { askOnCall };
