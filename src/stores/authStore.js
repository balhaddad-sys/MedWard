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
    handleRedirectResult(auth).catch((err) => {
      console.error('[Auth] Redirect result handling failed:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
      const result = await signInWithGoogleSafe(auth);

      if (result.error) {
        // On popup timeout, auto-fallback to redirect flow
        if (result.error === 'popup_timeout') {
          set({ error: AUTH_ERROR_MESSAGES[result.error] });
          // Force redirect as recovery — import signInWithRedirect for fallback
          const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(auth, provider);
          return;
        }

        set({
          error: AUTH_ERROR_MESSAGES[result.error] || AUTH_ERROR_MESSAGES.unknown_error,
          signingIn: false,
        });
      }
      // Success is handled by onAuthStateChanged listener
    } catch (err) {
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
