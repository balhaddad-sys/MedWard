import { useState, useCallback, createContext, useContext } from 'react';

/**
 * Toast Context for global toast management
 */
const ToastContext = createContext(null);

/**
 * Toast Provider Component
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ 
    message, 
    type = 'info', 
    duration = 4000,
    action,
    actionLabel 
  }) => {
    const id = Date.now() + Math.random();
    
    const newToast = {
      id,
      message,
      type,
      action,
      actionLabel,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return showToast({ message, type: 'success', ...options });
  }, [showToast]);

  const error = useCallback((message, options = {}) => {
    return showToast({ message, type: 'error', duration: 6000, ...options });
  }, [showToast]);

  const warning = useCallback((message, options = {}) => {
    return showToast({ message, type: 'warning', ...options });
  }, [showToast]);

  const info = useCallback((message, options = {}) => {
    return showToast({ message, type: 'info', ...options });
  }, [showToast]);

  const value = {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default useToast;
