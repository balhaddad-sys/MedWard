/**
 * MedWard Pro — Claude API Helper
 * Handles all communication with Anthropic's Claude API
 */

const { defineSecret } = require('firebase-functions/params');
const { UNIFIED_CONFIG } = require('../config');

// Firebase secret for API key
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

/**
 * Call Claude API with messages
 * @param {Object} options
 * @param {string} options.system - System prompt
 * @param {Array} options.messages - Messages array
 * @param {number} [options.maxTokens] - Max response tokens
 * @param {number} [options.temperature] - Temperature
 * @returns {Promise<string>} Claude's response text
 */
async function callClaude({ system, messages, maxTokens, temperature }) {
  const apiKey = ANTHROPIC_API_KEY.value();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Run: firebase functions:secrets:set ANTHROPIC_API_KEY');
  }

  const body = {
    model: UNIFIED_CONFIG.claude.model,
    max_tokens: maxTokens || UNIFIED_CONFIG.claude.maxTokens.clinical,
    temperature: temperature ?? UNIFIED_CONFIG.claude.temperature,
    messages,
  };

  if (system) {
    body.system = system;
  }

  const response = await fetch(UNIFIED_CONFIG.claude.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': UNIFIED_CONFIG.claude.apiVersion,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Claude API Error:', response.status, errBody);
    
    if (response.status === 429) {
      throw new Error('AI service is temporarily busy. Please try again in a moment.');
    }
    if (response.status === 401) {
      throw new Error('AI service authentication failed. Contact administrator.');
    }
    throw new Error(`AI service error (${response.status}). Please try again.`);
  }

  const data = await response.json();
  
  if (!data.content || !data.content.length) {
    throw new Error('Empty response from AI service.');
  }

  // Extract text from response
  const textParts = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text);

  return textParts.join('\n');
}

/**
 * Call Claude with image (vision)
 * @param {Object} options
 * @param {string} options.system - System prompt
 * @param {string} options.text - User text message
 * @param {string} options.imageBase64 - Base64 image data
 * @param {string} options.mediaType - Image MIME type
 * @param {number} [options.maxTokens] - Max response tokens
 * @returns {Promise<string>} Claude's response text
 */
async function callClaudeVision({ system, text, imageBase64, mediaType, maxTokens }) {
  const messages = [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType || 'image/jpeg',
          data: imageBase64,
        },
      },
      {
        type: 'text',
        text: text,
      },
    ],
  }];

  return callClaude({
    system,
    messages,
    maxTokens: maxTokens || UNIFIED_CONFIG.claude.maxTokens.labAnalysis,
  });
}

/**
 * Build a medical system prompt with standardized safety framing
 * @param {string} role - The specific clinical role/context
 * @param {string} instructions - Specific instructions for this function
 * @returns {string} Complete system prompt
 */
function buildMedicalSystemPrompt(role, instructions) {
  return `You are a medical AI assistant acting as ${role}. You provide evidence-based clinical decision support for healthcare professionals.

CRITICAL RULES:
- You are a decision support tool, NOT a replacement for clinical judgment
- Always include relevant safety considerations and red flags
- Reference current evidence-based guidelines where applicable
- Flag when a question requires immediate senior/specialist consultation
- Note drug interactions, contraindications, and allergies when relevant
- Use Kuwait/GCC context for local guidelines when applicable
- Provide SI units (Kuwait standard) for lab values

${instructions}

ALWAYS end your response with:
"${UNIFIED_CONFIG.disclaimer}"`;
}

module.exports = {
  callClaude,
  callClaudeVision,
  buildMedicalSystemPrompt,
  ANTHROPIC_API_KEY,
};
