import { useEffect, useCallback, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children?: ReactNode;
  /** Additional class names on the content panel */
  className?: string;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape],
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'animate-in fade-in duration-150',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Content panel */}
      <div
        className={clsx(
          'relative w-full bg-ward-card rounded-2xl shadow-xl',
          'transform transition-all duration-200',
          'animate-in slide-in-from-bottom-4 fade-in duration-200',
          'flex flex-col max-h-[90vh]',
          sizeStyles[size],
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ward-border shrink-0">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'ml-auto p-1.5 rounded-lg text-slate-400',
              'hover:text-slate-600 hover:bg-slate-100',
              'dark:hover:text-slate-200 dark:hover:bg-slate-700',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
            )}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export interface ModalFooterProps {
  children?: ReactNode;
  className?: string;
}

function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-t border-ward-border flex items-center justify-end gap-3 shrink-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Modal, ModalFooter };
