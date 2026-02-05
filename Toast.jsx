import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

/**
 * Toast Icons by type
 */
const ToastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Individual Toast Component
 */
const ToastItem = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { id, message, type, action, actionLabel } = toast;
  
  const Icon = ToastIcons[type] || ToastIcons.info;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 200);
  };

  const handleAction = () => {
    action?.();
    handleDismiss();
  };

  return (
    <div 
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
        {action && actionLabel && (
          <button 
            className="toast-action" 
            onClick={handleAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <button 
        className="toast-close" 
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * Toast Container Component
 * Renders all active toasts
 */
const ToastContainer = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  const content = (
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );

  return createPortal(content, document.body);
};

/**
 * Standalone Toast Function (for use outside React)
 * Creates temporary toast without context
 */
let toastContainer = null;

export const showStandaloneToast = ({ message, type = 'info', duration = 4000 }) => {
  // This is a simplified version for edge cases
  // Prefer using useToast hook in React components
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'standalone-toast-container';
    document.body.appendChild(toastContainer);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type} toast-enter`;
  toastEl.innerHTML = `
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
  `;

  toastContainer.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('toast-exit');
    setTimeout(() => {
      toastEl.remove();
    }, 200);
  }, duration);
};

export default ToastContainer;
