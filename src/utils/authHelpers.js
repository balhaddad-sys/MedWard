import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';

/**
 * Detects environments where signInWithPopup is unreliable.
 * Returns true if redirect flow should be used instead.
 * Only true for in-app browsers (WebViews) and standalone PWAs where popups
 * genuinely cannot open. Regular mobile browsers handle popups fine.
 */
export function shouldUseRedirect() {
  const ua = navigator.userAgent || '';

  // In-app browsers (WebViews) — popups are blocked entirely
  const isInAppBrowser =
    /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Snapchat|LinkedIn|TikTok/i.test(ua) ||
    (ua.includes('wv') && ua.includes('Android'));

  // Standalone PWA mode — no browser chrome to host a popup
  const isStandalonePWA =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  return isInAppBrowser || isStandalonePWA;
}

/**
 * Adaptive Google Sign-In: popup on desktop, redirect on mobile/WebView.
 *
 * @param {import('firebase/auth').Auth} auth - Firebase Auth instance
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function signInWithGoogle(auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (shouldUseRedirect()) {
    // Redirect flow — result is picked up on page reload via getRedirectResult()
    await signInWithRedirect(auth, provider);
    return null; // Page will reload; result handled elsewhere
  }

  // Popup flow with timeout protection (handled by authWithTimeout wrapper)
  return signInWithPopup(auth, provider);
}

/**
 * Call this once on app initialization (e.g., in your auth context provider)
 * to handle the redirect result when the user lands back on the app.
 *
 * @param {import('firebase/auth').Auth} auth
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function handleRedirectResult(auth) {
  try {
    const result = await getRedirectResult(auth);
    return result; // null if user didn't just come from a redirect
  } catch (error) {
    console.error('[Auth] Redirect result error:', error);
    throw error;
  }
}
