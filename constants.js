/**
 * Application Constants
 * MedWard Pro v9.0.0
 */

// App Info
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'MedWard Pro';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '9.0.0';
export const MEDWARD_VERSION = '3.7';
export const ONCALL_VERSION = '1.5';

// Patient Status
export const PATIENT_STATUS = {
  CRITICAL: 'critical',
  GUARDED: 'guarded',
  STABLE: 'stable',
};

export const PATIENT_STATUS_LABELS = {
  [PATIENT_STATUS.CRITICAL]: 'Critical',
  [PATIENT_STATUS.GUARDED]: 'Guarded',
  [PATIENT_STATUS.STABLE]: 'Stable',
};

export const PATIENT_STATUS_COLORS = {
  [PATIENT_STATUS.CRITICAL]: 'rose',
  [PATIENT_STATUS.GUARDED]: 'warning',
  [PATIENT_STATUS.STABLE]: 'emerald',
};

// Medication Status
export const MED_STATUS = {
  ACTIVE: 'active',
  PRN: 'prn',
  DISCONTINUED: 'discontinued',
  NEW: 'new',
};

// Priority Levels
export const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// On-Call Urgency
export const URGENCY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Wards
export const WARDS = [
  { id: 'icu', name: 'ICU', icon: '🏥', color: '#dc2626' },
  { id: 'ccu', name: 'CCU', icon: '❤️', color: '#f59e0b' },
  { id: 'medical', name: 'Medical Ward', icon: '🩺', color: '#3b82f6' },
  { id: 'surgical', name: 'Surgical Ward', icon: '⚕️', color: '#8b5cf6' },
  { id: 'neuro', name: 'Neurology', icon: '🧠', color: '#14b8a6' },
  { id: 'renal', name: 'Renal Unit', icon: '💧', color: '#06b6d4' },
];

// Navigation Items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'patients', label: 'Patients', icon: 'Users', path: '/patients' },
  { id: 'ai', label: 'AI Assist', icon: 'Brain', path: '/ai' },
  { id: 'references', label: 'References', icon: 'BookOpen', path: '/references' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
];

// AI Features
export const AI_FEATURES = [
  { id: 'askClinical', name: 'Ask Clinical', icon: 'MessageCircle', description: 'Clinical Q&A support' },
  { id: 'drugLookup', name: 'Drug Info', icon: 'Pill', description: 'Drug information lookup' },
  { id: 'labAnalysis', name: 'Lab Analysis', icon: 'FlaskConical', description: 'Analyze lab images' },
  { id: 'differential', name: 'Differential', icon: 'ListTree', description: 'Generate DDx' },
  { id: 'onCall', name: 'On-Call', icon: 'Phone', description: 'On-call guidance' },
  { id: 'antibiotic', name: 'Antibiotics', icon: 'Syringe', description: 'Antibiotic guidance' },
];

// Input Limits (matching backend)
export const MAX_TEXT_CHARS = 10000;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_REQUEST = 5;

// Timeouts
export const TEXT_TIMEOUT_MS = 60000; // 60 seconds
export const VISION_TIMEOUT_MS = 90000; // 90 seconds

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'medward_theme',
  LAST_WARD: 'medward_last_ward',
  USER_PREFS: 'medward_user_prefs',
  DRAFT_PATIENT: 'medward_draft_patient',
};

// Theme
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Date/Time Formats
export const DATE_FORMAT = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_SHORT: 'dd/MM/yyyy',
  DISPLAY_FULL: 'EEEE, dd MMMM yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd MMM yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

// Disclaimers
export const DISCLAIMERS = {
  AI_GENERAL: 'This is educational guidance only. Always use clinical judgment and verify with authoritative sources.',
  DRUG_INFO: 'Drug information is for reference only. Verify dosing and interactions before prescribing.',
  LAB_ANALYSIS: 'AI-assisted lab interpretation. Always correlate clinically and confirm critical values.',
  DIFFERENTIAL: 'AI-generated differential. Consider clinical context and appropriate workup.',
};

// Error Messages
export const ERRORS = {
  AUTH_REQUIRED: 'Please log in to continue.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AI_UNAVAILABLE: 'AI service temporarily unavailable. Please try again.',
  INVALID_INPUT: 'Please check your input and try again.',
  IMAGE_TOO_LARGE: `Image too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`,
  TOO_MANY_IMAGES: `Maximum ${MAX_IMAGES_PER_REQUEST} images allowed.`,
};
