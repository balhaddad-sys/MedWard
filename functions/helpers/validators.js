/**
 * MedWard Pro — Input Validators
 * Validates and sanitizes all incoming function parameters
 */

const { HttpsError } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');

const limits = UNIFIED_CONFIG.limits;

/**
 * Ensure user is authenticated
 */
function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use this feature.');
  }
  return request.auth.uid;
}

/**
 * Validate a string field
 */
function validateString(value, fieldName, maxLength) {
  if (!value || typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${fieldName} is required and must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new HttpsError('invalid-argument', `${fieldName} cannot be empty.`);
  }
  if (trimmed.length > maxLength) {
    throw new HttpsError('invalid-argument', `${fieldName} is too long (max ${maxLength} characters).`);
  }
  return trimmed;
}

/**
 * Validate clinical question input
 */
function validateClinicalQuestion(data) {
  const question = validateString(data.question, 'Question', limits.maxQuestionLength);
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  return { question, context };
}

/**
 * Validate drug lookup input
 */
function validateDrugLookup(data) {
  const drugName = validateString(data.drugName, 'Drug name', limits.maxDrugNameLength);
  const query = data.query ? validateString(data.query, 'Query', limits.maxQuestionLength) : null;
  return { drugName, query };
}

/**
 * Validate antibiotic guidance input
 */
function validateAntibioticGuidance(data) {
  const condition = validateString(data.condition, 'Condition', limits.maxQuestionLength);
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  const allergies = Array.isArray(data.allergies) ? data.allergies.filter(a => typeof a === 'string').slice(0, 20) : [];
  return { condition, context, allergies };
}

/**
 * Validate lab image input
 */
function validateLabImage(data) {
  if (!data.imageBase64 || typeof data.imageBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Image data is required.');
  }
  // Check approximate size (base64 is ~4/3 of original)
  const approxSizeMB = (data.imageBase64.length * 0.75) / (1024 * 1024);
  if (approxSizeMB > limits.maxImageSizeMB) {
    throw new HttpsError('invalid-argument', `Image too large (max ${limits.maxImageSizeMB}MB).`);
  }
  const mediaType = data.mediaType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) {
    throw new HttpsError('invalid-argument', 'Unsupported image format. Use JPEG, PNG, or WebP.');
  }
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  return { imageBase64: data.imageBase64, mediaType, context };
}

/**
 * Validate lab values for AI analysis
 */
function validateLabValues(data) {
  if (!data.labs || typeof data.labs !== 'object') {
    throw new HttpsError('invalid-argument', 'Lab values are required.');
  }
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  return { labs: data.labs, context };
}

/**
 * Validate differential diagnosis input
 */
function validateDifferential(data) {
  const symptoms = validateString(data.symptoms, 'Symptoms', limits.maxQuestionLength);
  const history = data.history ? validateString(data.history, 'History', limits.maxHistoryLength) : null;
  const vitals = data.vitals && typeof data.vitals === 'object' ? data.vitals : null;
  const age = data.age && typeof data.age === 'number' ? data.age : null;
  const sex = data.sex && ['M', 'F'].includes(data.sex) ? data.sex : null;
  return { symptoms, history, vitals, age, sex };
}

/**
 * Validate on-call assistant input
 */
function validateOnCall(data) {
  const scenario = validateString(data.scenario, 'Scenario', limits.maxQuestionLength);
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  const urgency = ['routine', 'urgent', 'emergency'].includes(data.urgency) ? data.urgency : 'routine';
  return { scenario, context, urgency };
}

/**
 * Validate electrolyte correction input
 */
function validateElectrolyteCorrection(data) {
  const electrolyte = validateString(data.electrolyte, 'Electrolyte', 50);
  const currentValue = data.currentValue;
  const targetValue = data.targetValue;
  if (typeof currentValue !== 'number' || typeof targetValue !== 'number') {
    throw new HttpsError('invalid-argument', 'Current and target values must be numbers.');
  }
  const weight = data.weight && typeof data.weight === 'number' ? data.weight : null;
  const context = data.context ? validateString(data.context, 'Context', limits.maxContextLength) : null;
  return { electrolyte, currentValue, targetValue, weight, context };
}

/**
 * Validate handover summary input
 */
function validateHandover(data) {
  if (!data.patients || !Array.isArray(data.patients) || data.patients.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one patient is required for handover.');
  }
  if (data.patients.length > 30) {
    throw new HttpsError('invalid-argument', 'Maximum 30 patients per handover.');
  }
  return { patients: data.patients };
}

module.exports = {
  requireAuth,
  validateString,
  validateClinicalQuestion,
  validateDrugLookup,
  validateAntibioticGuidance,
  validateLabImage,
  validateLabValues,
  validateDifferential,
  validateOnCall,
  validateElectrolyteCorrection,
  validateHandover,
};
