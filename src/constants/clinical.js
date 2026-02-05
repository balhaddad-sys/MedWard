/**
 * Clinical Constants for MedWard Pro
 *
 * This file contains all clinical thresholds, reference ranges, and validation
 * constants used throughout the application. Centralizing these values ensures
 * consistency and makes updates easier when guidelines change.
 */

// API Constraints (Anthropic limits)
export const API_CONSTRAINTS = {
  MAX_IMAGE_SIZE_MB: 5,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_TOKENS: 3000,
  TIMEOUT_MS: 90000,
  MAX_RETRIES: 3,
};

// Image processing constraints
export const IMAGE_CONSTRAINTS = {
  MAX_DIMENSION: 2048,
  TARGET_SIZE_KB: 4000,
  MIN_QUALITY: 0.1,
  INITIAL_QUALITY: 0.9,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
};

// Reference units for common lab tests
// Used to validate extracted values have correct units
export const REFERENCE_UNITS = {
  'Creatinine': { unit: 'mg/dL', normalRange: [0.7, 1.3] },
  'BUN': { unit: 'mg/dL', normalRange: [7, 20] },
  'WBC': { unit: 'K/µL', normalRange: [4.5, 11.0] },
  'Hemoglobin': { unit: 'g/dL', normalRange: [12.0, 17.5] },
  'Hematocrit': { unit: '%', normalRange: [36, 50] },
  'Platelets': { unit: 'K/µL', normalRange: [150, 400] },
  'Potassium': { unit: 'mEq/L', normalRange: [3.5, 5.0] },
  'Sodium': { unit: 'mEq/L', normalRange: [136, 145] },
  'Chloride': { unit: 'mEq/L', normalRange: [98, 106] },
  'CO2': { unit: 'mEq/L', normalRange: [23, 29] },
  'Glucose': { unit: 'mg/dL', normalRange: [70, 100] },
  'Calcium': { unit: 'mg/dL', normalRange: [8.5, 10.5] },
  'Magnesium': { unit: 'mg/dL', normalRange: [1.7, 2.2] },
  'Phosphorus': { unit: 'mg/dL', normalRange: [2.5, 4.5] },
  'Albumin': { unit: 'g/dL', normalRange: [3.5, 5.5] },
  'Total Protein': { unit: 'g/dL', normalRange: [6.0, 8.3] },
  'Bilirubin Total': { unit: 'mg/dL', normalRange: [0.1, 1.2] },
  'AST': { unit: 'U/L', normalRange: [10, 40] },
  'ALT': { unit: 'U/L', normalRange: [7, 56] },
  'ALP': { unit: 'U/L', normalRange: [44, 147] },
  'GGT': { unit: 'U/L', normalRange: [9, 48] },
  'LDH': { unit: 'U/L', normalRange: [140, 280] },
  'Troponin': { unit: 'ng/mL', normalRange: [0, 0.04] },
  'BNP': { unit: 'pg/mL', normalRange: [0, 100] },
  'INR': { unit: '', normalRange: [0.8, 1.2] },
  'PT': { unit: 'seconds', normalRange: [11, 13.5] },
  'PTT': { unit: 'seconds', normalRange: [25, 35] },
  'D-Dimer': { unit: 'ng/mL', normalRange: [0, 500] },
  'Lactate': { unit: 'mmol/L', normalRange: [0.5, 2.0] },
  'CRP': { unit: 'mg/L', normalRange: [0, 10] },
  'Procalcitonin': { unit: 'ng/mL', normalRange: [0, 0.5] },
  'TSH': { unit: 'mIU/L', normalRange: [0.4, 4.0] },
  'Free T4': { unit: 'ng/dL', normalRange: [0.8, 1.8] },
  'HbA1c': { unit: '%', normalRange: [4.0, 5.6] },
  'eGFR': { unit: 'mL/min/1.73m²', normalRange: [90, 120] },
};

// Critical thresholds that require immediate attention
// null means no critical threshold in that direction
export const CRITICAL_THRESHOLDS = {
  'Creatinine': { high: 4.0, low: null },
  'Potassium': { high: 6.5, low: 2.8 },
  'Sodium': { high: 160, low: 120 },
  'Glucose': { high: 500, low: 40 },
  'WBC': { high: 30, low: 2.0 },
  'Hemoglobin': { high: null, low: 7.0 },
  'Platelets': { high: null, low: 50 },
  'Calcium': { high: 13.0, low: 6.0 },
  'Magnesium': { high: 4.0, low: 1.0 },
  'Troponin': { high: 0.1, low: null },
  'Lactate': { high: 4.0, low: null },
  'INR': { high: 5.0, low: null },
  'pH': { high: 7.55, low: 7.25 },
  'pCO2': { high: 60, low: 25 },
  'pO2': { high: null, low: 60 },
};

// User-friendly error messages mapped from technical errors
export const ERROR_MESSAGES = {
  // Image errors
  'No file selected': 'Please select a lab report image to analyze.',
  'Invalid file type': 'This file type isn\'t supported. Please use JPEG, PNG, or WebP.',
  'File too large': 'Your image is too large. Please use an image under 5MB.',
  'Image compression failed': 'Could not process the image. Please try a different photo.',

  // API errors
  'ANTHROPIC_API_KEY': 'System configuration error. Please contact support.',
  'Network error': 'Connection failed. Check your internet and try again.',
  'timeout': 'The request took too long. Please try again.',
  'rate limit': 'Too many requests. Please wait a moment and try again.',

  // Analysis errors
  'No content': 'Could not extract lab data from the image. Try a clearer photo.',
  'No table': 'Could not find a recognizable lab table in the image.',
  'image exceeds': 'Image is too large. It will be compressed automatically.',

  // Auth errors
  'unauthenticated': 'Please sign in to use this feature.',
  'permission-denied': 'You don\'t have permission to access this resource.',

  // Default
  'default': 'Something went wrong. Please try again.',
};

/**
 * Get a user-friendly error message from a technical error
 * @param {string} technicalError - The technical error message
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyError(technicalError) {
  if (!technicalError) return ERROR_MESSAGES.default;

  const errorStr = String(technicalError).toLowerCase();

  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorStr.includes(key.toLowerCase())) {
      return message;
    }
  }

  return ERROR_MESSAGES.default;
}

/**
 * Check if a lab value is critical
 * @param {string} testName - Name of the test
 * @param {number} value - The test value
 * @returns {{ isCritical: boolean, direction: string|null, reason: string }}
 */
export function checkCriticalValue(testName, value) {
  const thresholds = CRITICAL_THRESHOLDS[testName];

  if (!thresholds) {
    return { isCritical: false, direction: null, reason: 'No critical threshold defined' };
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isCritical: false, direction: null, reason: 'Non-numeric value' };
  }

  if (thresholds.high !== null && numValue > thresholds.high) {
    return {
      isCritical: true,
      direction: 'high',
      reason: `CRITICAL HIGH: ${numValue} > ${thresholds.high}`,
    };
  }

  if (thresholds.low !== null && numValue < thresholds.low) {
    return {
      isCritical: true,
      direction: 'low',
      reason: `CRITICAL LOW: ${numValue} < ${thresholds.low}`,
    };
  }

  return { isCritical: false, direction: null, reason: 'Within safe range' };
}

/**
 * Validate unit consistency for a lab test
 * @param {string} testName - Name of the test
 * @param {string} reportedUnit - Unit reported in the lab result
 * @returns {{ valid: boolean, expected: string|null, note: string }}
 */
export function validateUnitConsistency(testName, reportedUnit) {
  const expected = REFERENCE_UNITS[testName];

  if (!expected) {
    return { valid: true, expected: null, note: 'Unknown test; cannot validate units' };
  }

  if (!expected.unit) {
    return { valid: true, expected: null, note: 'Unit-less measurement' };
  }

  const normalized = (reportedUnit || '').toLowerCase().trim();
  const expectedNorm = expected.unit.toLowerCase().trim();

  if (normalized !== expectedNorm) {
    return {
      valid: false,
      expected: expected.unit,
      note: `Unit mismatch: reported "${reportedUnit}", expected "${expected.unit}"`,
    };
  }

  return { valid: true, expected: expected.unit, note: 'Units match' };
}
