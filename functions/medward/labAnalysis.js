/**
 * MedWard Pro — Lab Analysis
 * Lab image OCR analysis and structured lab value interpretation
 */

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, callClaudeVision, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateLabImage, validateLabValues } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

// =============================================================================
// Lab Image Analysis (Vision)
// =============================================================================
const analyzeLabImage = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.vision,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'lab');

  const { imageBase64, mediaType, context } = validateLabImage(request.data);

  const system = buildMedicalSystemPrompt(
    'a clinical pathology and laboratory medicine specialist',
    `INSTRUCTIONS:
- Extract ALL lab values visible in the image
- Present values with reference ranges in SI units (Kuwait standard)
- Flag abnormal values: HIGH ↑, LOW ↓, CRITICAL ⚠️
- Group by category: Renal, Electrolytes, Hematology, Coagulation, Liver, Cardiac, Inflammatory, Metabolic, Thyroid, ABG
- Provide clinical interpretation considering the overall pattern
- Suggest follow-up tests if appropriate
- Note potential urgent findings requiring immediate action`
  );

  let text = 'Analyze this lab report image. Extract all values, flag abnormal results, and provide clinical interpretation.';
  if (context) {
    text += `\nClinical context: ${context}`;
  }

  const response = await callClaudeVision({
    system,
    text,
    imageBase64,
    mediaType,
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.labAnalysis,
  });

  return { response, timestamp: Date.now() };
});

// =============================================================================
// Structured Lab Analysis (Text-based)
// =============================================================================
const analyzeLabsWithClaude = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'lab');

  const { labs, context } = validateLabValues(request.data);

  const system = buildMedicalSystemPrompt(
    'a clinical pathology and laboratory medicine specialist',
    `INSTRUCTIONS:
- Analyze the provided lab values comprehensively
- Flag abnormal values with severity: mild, moderate, critical
- Identify patterns (e.g., AKI, DKA, sepsis markers, hepatic dysfunction)
- Suggest most likely clinical correlations
- Recommend follow-up investigations
- Note critical values requiring urgent notification
- Consider medication effects on lab values
- Use Kuwait SI reference ranges`
  );

  // Format labs into readable text
  let labText = 'Lab Values:\n';
  for (const [key, value] of Object.entries(labs)) {
    if (typeof value === 'object' && value !== null) {
      labText += `${key}: ${value.value} ${value.unit || ''}\n`;
    } else {
      labText += `${key}: ${value}\n`;
    }
  }

  if (context) {
    labText += `\nClinical Context: ${context}`;
  }

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: labText }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.labAnalysis,
  });

  return { response, timestamp: Date.now() };
});

module.exports = { analyzeLabImage, analyzeLabsWithClaude };
