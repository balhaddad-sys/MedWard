/**
 * MedWard Pro — Drug Info
 * Drug information lookup and interaction checking
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateDrugLookup } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const getDrugInfo = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'drug');

  const { drugName, query } = validateDrugLookup(request.data);

  const system = buildMedicalSystemPrompt(
    'a clinical pharmacology advisor',
    `INSTRUCTIONS:
- Provide comprehensive drug information in structured format
- Include: Class, Mechanism, Indications, Dosing (adult), Route, Key Interactions, Contraindications, Side Effects, Monitoring, Special Notes
- Use Kuwait/GCC formulary context where applicable
- Flag high-alert medications prominently
- Include renal/hepatic dose adjustments
- Note pregnancy/lactation categories
- Highlight critical drug interactions`
  );

  let userMessage = `Drug: ${drugName}`;
  if (query) {
    userMessage += `\nSpecific question: ${query}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.drug,
  });

  return { response, drugName, timestamp: Date.now() };
});

module.exports = { getDrugInfo };
