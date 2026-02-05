import { create } from 'zustand';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from '../config/firebase';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Initialize listener — call once in App.jsx
  init: () => {
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
      });
    });
    return unsubscribe;
  },

  login: async () => {
    try {
      set({ error: null });
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      set({ error: err.message });
    }
  },

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
