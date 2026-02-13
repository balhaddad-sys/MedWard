/**
 * PHI (Protected Health Information) Redaction Utility
 *
 * Strips identifiable patient data before storing prompts in cache.
 * Patterns cover HIPAA-defined identifiers: names, MRN, DOB, phone,
 * email, Civil ID, file numbers, and free-text name patterns.
 *
 * This is a defence-in-depth layer — the canonical patient context is
 * already separated from the prompt by the caller. This catches
 * anything that leaks through.
 */

// Order matters: longer / more-specific patterns first to avoid partial matches.
const PHI_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Email addresses
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL]" },

  // Phone numbers (international, local, US, UK, GCC)
  { regex: /(?:\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, replacement: "[PHONE]" },

  // Dates: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YYYY
  { regex: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, replacement: "[DATE]" },
  { regex: /\b\d{4}-\d{2}-\d{2}\b/g, replacement: "[DATE]" },
  { regex: /\b\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2,4}\b/gi, replacement: "[DATE]" },

  // MRN / File Number patterns (6-12 digit numeric IDs)
  { regex: /\b(?:MRN|mrn|File\s*(?:#|No|Number)?)[:\s]*\d{4,12}\b/gi, replacement: "[MRN]" },

  // Civil ID / National ID (9-12 digits, common in GCC)
  { regex: /\b(?:Civil\s*ID|CID|National\s*ID)[:\s]*\d{6,12}\b/gi, replacement: "[CIVIL_ID]" },

  // Standalone long numeric IDs (8+ digits, likely MRN/ID if not preceded by a unit)
  { regex: /(?<![A-Za-z])\b\d{8,}\b(?!\s*(?:mg|mcg|mL|mmol|units|U\/L|g\/dL|mg\/dL|mEq|mmHg|bpm|%))/g, replacement: "[ID]" },

  // Common name label patterns: "Patient: John Smith", "Name: Al-Rashid, Ali"
  { regex: /(?:Patient|Name|Pt)[:\s]+[A-Z][a-z]+(?:[- ][A-Za-z]+){0,3}/g, replacement: "[NAME]" },

  // "Mr./Mrs./Dr. Lastname" patterns
  { regex: /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+[A-Z][a-z]+(?:[- ][A-Za-z]+)?/g, replacement: "[NAME]" },
];

/**
 * Redact PHI from a prompt string.
 * Returns the cleaned text safe for caching/embedding storage.
 */
export function redactPHI(input: string): string {
  let result = input;
  for (const { regex, replacement } of PHI_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

/**
 * Normalize whitespace and lowercase for consistent hashing.
 * Applied *after* PHI redaction.
 */
export function normalizeForHash(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
