import { create } from 'zustand';
import { auth, signOut, onAuthStateChanged } from '../config/firebase';
import { signInWithGoogleSafe, AUTH_ERROR_MESSAGES } from '../utils/authWithTimeout';
import { handleRedirectResult } from '../utils/authHelpers';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  signingIn: false,

  // Initialize listener — call once in App.jsx
  init: () => {
    // Handle redirect result for mobile/WebView sign-in flow
    handleRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('[Auth] Redirect sign-in successful:', result.user?.email);
        }
      })
      .catch((err) => {
        console.error('[Auth] Redirect result handling failed:', err);
        // Surface redirect errors to the user
        const errorMessage = err.code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled.'
          : err.code === 'auth/network-request-failed'
          ? 'Network error. Check your connection.'
          : err.message || 'Sign-in failed. Please try again.';
        set({ error: errorMessage, loading: false, signingIn: false });
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Auth] State changed:', user?.email || 'signed out');
      set({
        user: user
          ? {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }
          : null,
        loading: false,
        signingIn: false,
      });
    });
    return unsubscribe;
  },

  login: async () => {
    try {
      set({ error: null, signingIn: true });
      console.log('[Auth] Starting sign-in...');
      const result = await signInWithGoogleSafe(auth);
      console.log('[Auth] Sign-in result:', result);

      if (result.error) {
        console.error('[Auth] Sign-in error:', result.error);
        // On popup timeout, auto-fallback to redirect flow
        if (result.error === 'popup_timeout') {
          set({ error: AUTH_ERROR_MESSAGES[result.error] });
          // Force redirect as recovery — import signInWithRedirect for fallback
          const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          console.log('[Auth] Falling back to redirect flow...');
          await signInWithRedirect(auth, provider);
          return;
        }

        set({
          error: AUTH_ERROR_MESSAGES[result.error] || AUTH_ERROR_MESSAGES.unknown_error,
          signingIn: false,
        });
      } else {
        console.log('[Auth] Sign-in successful, waiting for onAuthStateChanged...');
      }
      // Success is handled by onAuthStateChanged listener
    } catch (err) {
      console.error('[Auth] Sign-in exception:', err);
      set({ error: err.message, signingIn: false });
    }
  },

  clearError: () => set({ error: null }),

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (err) {
      set({ error: err.message });
    }
  },
}));

export default useAuthStore;
