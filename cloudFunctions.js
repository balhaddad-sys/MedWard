import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';

/**
 * Cloud Functions SDK
 * Interface for AI-powered backend functions
 */

// Function references with timeout configuration
const createFunction = (name, timeout = 60000) => {
  return httpsCallable(functions, name, { timeout });
};

// Text-based functions (60s timeout)
const askClinicalFn = createFunction('askClinical', 60000);
const getDrugInfoFn = createFunction('getDrugInfo', 60000);
const getAntibioticGuidanceFn = createFunction('getAntibioticGuidance', 60000);
const generateDifferentialFn = createFunction('generateDifferential', 60000);
const askOnCallFn = createFunction('askOnCall', 60000);
const generateHandoverSummaryFn = createFunction('generateHandoverSummary', 60000);
const verifyElectrolyteCorrectionFn = createFunction('verifyElectrolyteCorrection', 60000);

// Vision functions (90s timeout)
const analyzeLabImageFn = createFunction('analyzeLabImage', 90000);
const analyzeLabsWithClaudeFn = createFunction('analyzeLabsWithClaude', 90000);

// Static functions (30s timeout)
const getReferenceRangesFn = createFunction('getReferenceRanges', 30000);
const getClinicalProtocolFn = createFunction('getClinicalProtocol', 30000);

/**
 * CloudFunctions SDK
 */
export const CloudFunctions = {
  /**
   * Ask clinical question
   * @param {string} question - Clinical question
   * @param {object} context - Patient context { diagnosis, medications, labs, vitals }
   * @returns {Promise<{answer: string, references?: string[], confidence?: string}>}
   */
  async askClinical(question, context = {}) {
    try {
      const result = await askClinicalFn({ question, context });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'askClinical');
    }
  },

  /**
   * Get drug information
   * @param {string} drugName - Name of the drug
   * @param {string} indication - Clinical indication (optional)
   * @returns {Promise<{drugInfo: object}>}
   */
  async getDrugInfo(drugName, indication = '') {
    try {
      const result = await getDrugInfoFn({ drugName, indication });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'getDrugInfo');
    }
  },

  /**
   * Get antibiotic guidance
   * @param {string} condition - Infection/condition
   * @param {object} factors - { allergies, renalFunction, weight, age }
   * @returns {Promise<{recommendations: object}>}
   */
  async getAntibioticGuidance(condition, factors = {}) {
    try {
      const result = await getAntibioticGuidanceFn({ condition, factors });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'getAntibioticGuidance');
    }
  },

  /**
   * Analyze lab image (OCR + interpretation)
   * @param {string} imageBase64 - Base64 encoded image
   * @param {object} context - Patient context
   * @returns {Promise<{extractedValues: object, interpretation: string}>}
   */
  async analyzeLabImage(imageBase64, context = {}) {
    try {
      const result = await analyzeLabImageFn({ 
        image: imageBase64, 
        context 
      });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'analyzeLabImage');
    }
  },

  /**
   * Analyze labs with AI interpretation
   * @param {object} labValues - Lab values object
   * @param {object} context - Patient context
   * @returns {Promise<{interpretation: string, abnormalities: array, recommendations: array}>}
   */
  async analyzeLabsWithClaude(labValues, context = {}) {
    try {
      const result = await analyzeLabsWithClaudeFn({ 
        labs: labValues, 
        context 
      });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'analyzeLabsWithClaude');
    }
  },

  /**
   * Generate differential diagnosis
   * @param {object} presentation - { symptoms, signs, history, labFindings }
   * @param {object} options - { maxDifferentials, includeRare }
   * @returns {Promise<{differentials: array}>}
   */
  async generateDifferential(presentation, options = {}) {
    try {
      const result = await generateDifferentialFn({ 
        presentation, 
        options 
      });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'generateDifferential');
    }
  },

  /**
   * Ask on-call assistant
   * @param {string} question - Clinical question
   * @param {string} urgency - 'routine' | 'urgent' | 'emergent'
   * @returns {Promise<{answer: string, actions: array}>}
   */
  async askOnCall(question, urgency = 'routine') {
    try {
      const result = await askOnCallFn({ question, urgency });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'askOnCall');
    }
  },

  /**
   * Generate patient handover summary
   * @param {string} patientId - Patient document ID
   * @returns {Promise<{summary: string, keyIssues: array, pendingTasks: array}>}
   */
  async generateHandoverSummary(patientId) {
    try {
      const result = await generateHandoverSummaryFn({ patientId });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'generateHandoverSummary');
    }
  },

  /**
   * Verify electrolyte correction calculation
   * @param {object} params - { currentValue, targetValue, weight, electrolyte, formula }
   * @returns {Promise<{verification: object, correctionPlan: string}>}
   */
  async verifyElectrolyteCorrection(params) {
    try {
      const result = await verifyElectrolyteCorrectionFn(params);
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'verifyElectrolyteCorrection');
    }
  },

  /**
   * Get reference ranges (static, cached)
   * @param {string} category - Lab category (optional)
   * @returns {Promise<{ranges: object}>}
   */
  async getReferenceRanges(category = null) {
    try {
      const result = await getReferenceRangesFn({ category });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'getReferenceRanges');
    }
  },

  /**
   * Get clinical protocol (static, cached)
   * @param {string} protocolName - Protocol identifier
   * @returns {Promise<{protocol: object}>}
   */
  async getClinicalProtocol(protocolName) {
    try {
      const result = await getClinicalProtocolFn({ name: protocolName });
      return {
        success: true,
        ...result.data,
      };
    } catch (error) {
      return handleFunctionError(error, 'getClinicalProtocol');
    }
  },
};

/**
 * Handle function errors uniformly
 * @param {Error} error 
 * @param {string} functionName 
 * @returns {{success: false, error: string, code?: string}}
 */
function handleFunctionError(error, functionName) {
  console.error(`${functionName} error:`, error);
  
  // Firebase function errors
  if (error.code) {
    const errorMessages = {
      'functions/cancelled': 'Request was cancelled.',
      'functions/unknown': 'An unknown error occurred.',
      'functions/invalid-argument': 'Invalid input provided.',
      'functions/deadline-exceeded': 'Request timed out. Please try again.',
      'functions/not-found': 'Function not found.',
      'functions/permission-denied': 'You do not have permission.',
      'functions/resource-exhausted': 'Rate limit exceeded. Please wait.',
      'functions/unauthenticated': 'Please sign in to use this feature.',
      'functions/unavailable': 'Service temporarily unavailable.',
      'functions/internal': 'Internal error. Please try again.',
    };

    return {
      success: false,
      error: errorMessages[error.code] || error.message,
      code: error.code,
    };
  }

  // Network errors
  if (error.message?.includes('network')) {
    return {
      success: false,
      error: 'Network error. Please check your connection.',
      code: 'network-error',
    };
  }

  // Generic error
  return {
    success: false,
    error: 'Something went wrong. Please try again.',
    code: 'unknown',
  };
}

/**
 * AI response validator
 * Ensures AI responses include required disclaimer
 */
export function validateAIResponse(response) {
  const disclaimer = '⚠️ This is AI-generated guidance for educational purposes only. Always verify with clinical guidelines and senior colleagues.';
  
  if (!response?.answer?.includes('⚠️')) {
    return {
      ...response,
      answer: `${response.answer}\n\n${disclaimer}`,
    };
  }
  return response;
}

export default CloudFunctions;
