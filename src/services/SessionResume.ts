/**
 * Session Resume (Phase 7)
 *
 * Persist and restore session state for fast resume on reload
 * Improves mobile UX by restoring: last patient, scroll position, active tab
 */

const SESSION_STORAGE_KEY = 'session_state';
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface SessionState {
  lastPatientId?: string;
  lastRoute?: string;
  scrollPosition?: {
    route: string;
    position: number;
  };
  activeTab?: string;
  timestamp: number;
}

export class SessionResume {
  /**
   * Save current session state
   */
  static saveSession(state: Partial<SessionState>) {
    const currentState = this.getSession() || {};

    const newState: SessionState = {
      ...currentState,
      ...state,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  /**
   * Get current session state (if not expired)
   */
  static getSession(): SessionState | null {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return null;

      const state: SessionState = JSON.parse(saved);

      // Check if expired
      const age = Date.now() - state.timestamp;
      if (age > SESSION_EXPIRY_MS) {
        this.clearSession();
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load session state:', error);
      return null;
    }
  }

  /**
   * Save last viewed patient
   */
  static saveLastPatient(patientId: string) {
    this.saveSession({ lastPatientId: patientId });
  }

  /**
   * Save scroll position for a route
   */
  static saveScrollPosition(route: string, position: number) {
    this.saveSession({
      scrollPosition: {
        route,
        position,
      },
    });
  }

  /**
   * Save active tab
   */
  static saveActiveTab(tabId: string) {
    this.saveSession({ activeTab: tabId });
  }

  /**
   * Save last route
   */
  static saveLastRoute(route: string) {
    this.saveSession({ lastRoute: route });
  }

  /**
   * Get last viewed patient
   */
  static getLastPatient(): string | null {
    const session = this.getSession();
    return session?.lastPatientId || null;
  }

  /**
   * Get scroll position for a route
   */
  static getScrollPosition(route: string): number | null {
    const session = this.getSession();
    if (session?.scrollPosition?.route === route) {
      return session.scrollPosition.position;
    }
    return null;
  }

  /**
   * Get active tab
   */
  static getActiveTab(): string | null {
    const session = this.getSession();
    return session?.activeTab || null;
  }

  /**
   * Get last route
   */
  static getLastRoute(): string | null {
    const session = this.getSession();
    return session?.lastRoute || null;
  }

  /**
   * Clear session state
   */
  static clearSession() {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  }

  /**
   * Check if session is valid
   */
  static hasValidSession(): boolean {
    return this.getSession() !== null;
  }
}
