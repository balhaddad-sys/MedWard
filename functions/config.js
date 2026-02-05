/**
 * MedWard Pro — Unified Configuration
 */

const UNIFIED_CONFIG = {
  // Claude API
  claude: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: {
      clinical: 2048,
      drug: 2048,
      labAnalysis: 3000,
      differential: 2048,
      onCall: 2048,
      antibiotic: 2048,
      handover: 3000,
      electrolyte: 1024
    },
    temperature: 0.3,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    apiVersion: '2023-06-01'
  },

  // Cloud Function timeouts
  timeouts: {
    text: 60,       // seconds — text-based functions
    vision: 90,     // seconds — image analysis
    static: 30      // seconds — reference/cache lookups
  },

  // Input limits
  limits: {
    maxQuestionLength: 2000,
    maxDrugNameLength: 200,
    maxContextLength: 3000,
    maxSymptoms: 20,
    maxImages: 5,
    maxImageSizeMB: 10,
    maxHistoryLength: 1000
  },

  // Cache TTL (seconds)
  cache: {
    clinical: 3600,       // 1 hour
    drug: 86400,          // 24 hours
    lab: 1800,            // 30 minutes
    differential: 3600,   // 1 hour
    onCall: 3600,         // 1 hour
    antibiotic: 86400,    // 24 hours
    reference: 604800,    // 7 days
    protocol: 604800      // 7 days
  },

  // Rate limits (per user per hour)
  rateLimits: {
    clinical: 30,
    drug: 50,
    lab: 20,
    differential: 20,
    onCall: 30,
    antibiotic: 30
  },

  // CORS
  cors: true,

  // Disclaimer
  disclaimer: 'This information is AI-generated for educational purposes only. It should not replace clinical judgment, institutional protocols, or consultation with qualified healthcare professionals.'
};

module.exports = { UNIFIED_CONFIG };
