import { signInWithGoogle, shouldUseRedirect } from './authHelpers';

const POPUP_TIMEOUT_MS = 25000; // 25 seconds

/**
 * Maps internal error keys to user-facing messages.
 */
export const AUTH_ERROR_MESSAGES = {
  popup_blocked:
    'Your browser blocked the sign-in popup. Please allow popups for this site, or tap "Sign in with redirect" below.',
  popup_closed: 'You closed the sign-in window. Please try again.',
  popup_cancelled: 'Sign-in was cancelled. Please try again.',
  popup_timeout:
    'Sign-in took too long. This can happen if the popup was blocked. Trying redirect method...',
  network_error: 'Network error. Please check your connection and try again.',
  redirect_failed: 'Could not initiate sign-in. Please try again.',
  unknown_error: 'Something went wrong. Please try again or contact support.',
};

/**
 * Wraps signInWithGoogle with timeout protection and structured error handling.
 *
 * @param {import('firebase/auth').Auth} auth
 * @returns {Promise<{ user: object | null, error: string | null }>}
 */
export async function signInWithGoogleSafe(auth) {
  // Redirect flow doesn't need timeout — it navigates away
  if (shouldUseRedirect()) {
    try {
      await signInWithGoogle(auth);
      return { user: null, error: null }; // Will redirect
    } catch (err) {
      console.error('[Auth] Redirect initiation failed:', err);
      return { user: null, error: 'redirect_failed' };
    }
  }

  // Popup flow with timeout
  try {
    const result = await Promise.race([
      signInWithGoogle(auth),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('POPUP_TIMEOUT')), POPUP_TIMEOUT_MS)
      ),
    ]);
    return { user: result.user, error: null };
  } catch (err) {
    const code = err?.code || err?.message || 'unknown';
    console.error('[Auth] Sign-in error:', code, err);

    // Map Firebase error codes to actionable UI messages
    const errorMap = {
      'auth/popup-blocked': 'popup_blocked',
      'auth/popup-closed-by-user': 'popup_closed',
      'auth/cancelled-popup-request': 'popup_cancelled',
      'auth/network-request-failed': 'network_error',
      POPUP_TIMEOUT: 'popup_timeout',
    };

    return {
      user: null,
      error: errorMap[code] || 'unknown_error',
    };
  }
}
