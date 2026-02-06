/**
 * Session Manager - Handles mode session persistence and restoration
 * Integrates with modeStore for cross-session state management
 */

const SESSION_KEY = 'medward_session';
const SESSION_EXPIRY_HOURS = 8; // Clinical shift duration

/**
 * Save session data to localStorage
 */
export function saveSession(sessionData) {
  try {
    const session = {
      ...sessionData,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('[SessionManager] Failed to save session:', error);
    return false;
  }
}

/**
 * Load session data from localStorage
 */
export function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);

    // Check if session has expired
    const expiryMs = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > expiryMs) {
      console.log('[SessionManager] Session expired, clearing');
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('[SessionManager] Failed to load session:', error);
    return null;
  }
}

/**
 * Clear session data
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    return true;
  } catch (error) {
    console.error('[SessionManager] Failed to clear session:', error);
    return false;
  }
}

/**
 * Update specific session fields
 */
export function updateSession(updates) {
  const current = loadSession() || {};
  return saveSession({ ...current, ...updates });
}

/**
 * Save mode-specific context
 */
export function saveModeContext(mode, context) {
  const session = loadSession() || {};
  const modeContexts = session.modeContexts || {};

  return saveSession({
    ...session,
    modeContexts: {
      ...modeContexts,
      [mode]: {
        ...context,
        savedAt: Date.now(),
      },
    },
  });
}

/**
 * Load mode-specific context
 */
export function loadModeContext(mode) {
  const session = loadSession();
  if (!session?.modeContexts) return null;
  return session.modeContexts[mode] || null;
}

/**
 * Save tool usage for recency scoring
 */
export function recordToolUsage(toolId) {
  const session = loadSession() || {};
  const toolUsage = session.toolUsage || {};

  return saveSession({
    ...session,
    toolUsage: {
      ...toolUsage,
      [toolId]: Date.now(),
    },
  });
}

/**
 * Get tool last used timestamp
 */
export function getToolLastUsed(toolId) {
  const session = loadSession();
  return session?.toolUsage?.[toolId] || null;
}

/**
 * Clear tool usage history
 */
export function clearToolUsage() {
  const session = loadSession() || {};
  return saveSession({
    ...session,
    toolUsage: {},
  });
}

/**
 * Save patient selection history
 */
export function saveRecentPatient(patient) {
  if (!patient?.id) return false;

  const session = loadSession() || {};
  const recentPatients = session.recentPatients || [];

  // Remove if already in list
  const filtered = recentPatients.filter((p) => p.id !== patient.id);

  // Add to front, limit to 10
  const updated = [
    { id: patient.id, name: patient.name, ward: patient.ward, accessedAt: Date.now() },
    ...filtered,
  ].slice(0, 10);

  return saveSession({
    ...session,
    recentPatients: updated,
  });
}

/**
 * Get recent patients
 */
export function getRecentPatients() {
  const session = loadSession();
  return session?.recentPatients || [];
}

/**
 * Save active timers (for emergency mode)
 */
export function saveTimers(timers) {
  const session = loadSession() || {};
  return saveSession({
    ...session,
    activeTimers: timers,
  });
}

/**
 * Load active timers
 */
export function loadTimers() {
  const session = loadSession();
  return session?.activeTimers || [];
}

/**
 * Create a session snapshot for backup/sync
 */
export function createSnapshot() {
  const session = loadSession();
  if (!session) return null;

  return {
    ...session,
    snapshotAt: Date.now(),
    deviceInfo: {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    },
  };
}

/**
 * Restore from snapshot
 */
export function restoreFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    console.error('[SessionManager] Invalid snapshot');
    return false;
  }

  // Validate snapshot structure
  if (!snapshot.timestamp) {
    console.error('[SessionManager] Snapshot missing timestamp');
    return false;
  }

  return saveSession({
    ...snapshot,
    restoredAt: Date.now(),
  });
}

/**
 * Get session age in minutes
 */
export function getSessionAge() {
  const session = loadSession();
  if (!session?.timestamp) return null;
  return Math.floor((Date.now() - session.timestamp) / (60 * 1000));
}

/**
 * Check if session is valid
 */
export function isSessionValid() {
  const session = loadSession();
  if (!session) return false;

  const expiryMs = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
  return Date.now() - session.timestamp < expiryMs;
}

export default {
  saveSession,
  loadSession,
  clearSession,
  updateSession,
  saveModeContext,
  loadModeContext,
  recordToolUsage,
  getToolLastUsed,
  clearToolUsage,
  saveRecentPatient,
  getRecentPatients,
  saveTimers,
  loadTimers,
  createSnapshot,
  restoreFromSnapshot,
  getSessionAge,
  isSessionValid,
};
