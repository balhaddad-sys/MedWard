import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable confirmation dialog for destructive / safety-critical actions.
 *
 * @param {boolean} open - Whether the dialog is visible
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {string} confirmLabel - Label for the confirm button (default: "Confirm")
 * @param {string} variant - 'danger' | 'warning' (default: 'danger')
 * @param {function} onConfirm - Called when user confirms
 * @param {function} onCancel - Called when user cancels
 */
export default function ConfirmDialog({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const colors =
    variant === 'danger'
      ? {
          icon: 'text-red-600 bg-red-100',
          btn: 'bg-red-600 hover:bg-red-700 text-white',
        }
      : {
          icon: 'text-amber-600 bg-amber-100',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${colors.icon} flex-shrink-0`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-neutral-900">{title}</h3>
              <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{message}</p>
            </div>
            <button onClick={onCancel} className="p-1 text-neutral-400 hover:text-neutral-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${colors.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
