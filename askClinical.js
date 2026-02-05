/**
 * MedWard Pro — Ask Clinical
 * General clinical question answering
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateClinicalQuestion } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const askClinical = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'clinical');

  const { question, context } = validateClinicalQuestion(request.data);

  const system = buildMedicalSystemPrompt(
    'a senior clinical advisor for ward-based healthcare professionals',
    `INSTRUCTIONS:
- Provide concise, evidence-based answers to clinical questions
- Structure responses clearly: Assessment → Management → Key Points
- Include relevant guidelines (NICE, WHO, Kuwait MOH where applicable)
- Flag red flags and urgent considerations
- Mention drug interactions and contraindications when relevant
- Keep responses practical and ward-focused`
  );

  let userMessage = question;
  if (context) {
    userMessage = `Clinical Context: ${context}\n\nQuestion: ${question}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.clinical,
  });

  return { response, timestamp: Date.now() };
});

module.exports = { askClinical };
