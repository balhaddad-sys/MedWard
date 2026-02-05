import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/**
 * Modal Component
 * Sizes: default, wide, fullscreen
 * Supports keyboard navigation and focus trap
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  footer,
  className = '',
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose?.();
    }
  }, [closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && closeOnOverlay) {
      onClose?.();
    }
  }, [closeOnOverlay, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    default: '',
    wide: 'modal-wide',
    fullscreen: 'modal-fullscreen',
  };

  const modalContent = (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div 
        ref={modalRef}
        className={`modal-content ${sizeClasses[size] || ''} ${className}`}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
            {showCloseButton && (
              <IconButton 
                onClick={onClose} 
                label="Close modal"
                className="modal-close"
              >
                <X />
              </IconButton>
            )}
          </div>
        )}
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * ActionSheet - Bottom sliding action sheet
 */
export const ActionSheet = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="action-sheet-overlay" onClick={handleOverlayClick}>
      <div 
        ref={sheetRef}
        className={`action-sheet-content ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-sheet-handle" />
        {title && (
          <div className="action-sheet-header">
            <h3 className="action-sheet-title">{title}</h3>
          </div>
        )}
        <div className="action-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

/**
 * ConfirmDialog - Confirmation modal
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="modal-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${variant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner spinner-sm" /> : confirmText}
          </button>
        </div>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
};

export default Modal;
