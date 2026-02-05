import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  deleteUser
} from 'firebase/auth';
import { auth } from '../config/firebase.config';

/**
 * Auth Service
 * Wrapper around Firebase Authentication
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Create new user account
   */
  async signUp(email, password, displayName = null) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return { user: result.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error: formatAuthError(error) };
    }
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Update user profile
   */
  async updateUserProfile(updates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      await updateProfile(user, updates);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Update user password
   */
  async updateUserPassword(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(password) {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete account
      await deleteUser(user);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: formatAuthError(error) 
      };
    }
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!auth.currentUser;
  },

  /**
   * Get user ID token (for backend calls)
   */
  async getIdToken(forceRefresh = false) {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken(forceRefresh);
  },
};

/**
 * Format Firebase auth errors to user-friendly messages
 */
function formatAuthError(error) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Operation not allowed.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/requires-recent-login': 'Please sign in again to complete this action.',
  };

  const code = error?.code || '';
  return errorMessages[code] || error?.message || 'An error occurred.';
}

export default authService;
