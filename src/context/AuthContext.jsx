import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wrap your app with this to enable auth throughout
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

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
          metadata: {
            creationTime: firebaseUser.metadata?.creationTime,
            lastSignInTime: firebaseUser.metadata?.lastSignInTime,
          },
        });
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Sign in
  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.signIn(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await authService.signInWithGoogle();

    if (!result.user) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  // Sign up
  const signUp = useCallback(async (email, password, displayName = '') => {
    setLoading(true);
    setError(null);
    
    const result = await authService.signUp(email, password, displayName);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await authService.signOut();
    
    if (!result.success) {
      setError(result.error);
    } else {
      setUser(null);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.resetPassword(email);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.updateUserProfile(data);
    
    if (result.success) {
      setUser(prev => ({
        ...prev,
        ...data,
      }));
    } else {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.changePassword(currentPassword, newPassword);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Delete account
  const deleteAccount = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.deleteAccount(password);
    
    if (result.success) {
      setUser(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get ID token (for API calls)
  const getIdToken = useCallback(async (forceRefresh = false) => {
    try {
      return await authService.getIdToken(forceRefresh);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const value = {
    // State
    user,
    loading,
    error,
    initialized,
    isAuthenticated: !!user,
    
    // Methods
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    changePassword,
    deleteAccount,
    clearError,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext Hook
 * Access auth context in components
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * withAuth HOC
 * Wrap components that require authentication
 */
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading, initialized } = useAuthContext();

    // Still initializing
    if (!initialized || loading) {
      return (
        <div className="auth-loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      );
    }

    // Not authenticated
    if (!isAuthenticated) {
      return null; // Or redirect to login
    }

    return <Component {...props} />;
  };
}

/**
 * RequireAuth Component
 * Wrapper component for protected routes
 */
export function RequireAuth({ children, fallback = null }) {
  const { isAuthenticated, loading, initialized } = useAuthContext();

  if (!initialized || loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || <Navigate to="/login" replace />;
  }

  return children;
}

export default AuthContext;
