// ─── Session Manager: Persists and restores per-mode clinical context ────────

const SESSION_KEY = 'medward-session';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8-hour shift

/**
 * Save the current session snapshot.
 */
export function saveSession(data) {
  try {
    const payload = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/**
 * Load the saved session if it hasn't expired.
 * Returns null if no valid session exists.
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > SESSION_TTL) {
      clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the saved session.
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // noop
  }
}

/**
 * Record a mode switch event for analytics / audit.
 */
export function logModeSwitch(fromMode, toMode, patientId = null) {
  try {
    const LOG_KEY = 'medward-mode-log';
    const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');

    existing.push({
      from: fromMode,
      to: toMode,
      patientId,
      timestamp: Date.now(),
    });

    // Keep only last 50 entries
    const trimmed = existing.slice(-50);
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // noop
  }
}

/**
 * Get mode switch history.
 */
export function getModeSwitchLog() {
  try {
    return JSON.parse(localStorage.getItem('medward-mode-log') || '[]');
  } catch {
    return [];
  }
}
