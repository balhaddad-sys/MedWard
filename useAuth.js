import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

/**
 * useAuth Hook
 * Manages authentication state and provides auth methods
 * 
 * Usage:
 * const { user, loading, signIn, signOut, error } = useAuth();
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.signIn(email, password);
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Sign in failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, displayName = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.signUp(email, password, displayName);
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Sign up failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.signOut();
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Sign out failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.resetPassword(email);
      if (!result.success) {
        setError(result.error);
        return result;
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Password reset failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.updateUserProfile(data);
      if (result.success) {
        // Update local user state
        setUser(prev => ({
          ...prev,
          ...data,
        }));
      } else {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Profile update failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Password change failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    changePassword,
    clearError,
  };
}

export default useAuth;
