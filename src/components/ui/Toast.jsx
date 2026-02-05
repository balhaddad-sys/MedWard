import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import useUIStore from '../../stores/uiStore';

const icons = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-stable-green-bg border-stable-green-border text-stable-green',
  error: 'bg-critical-red-bg border-critical-red-border text-critical-red',
  info: 'bg-info-blue-bg border-blue-200 text-info-blue',
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = icons[toast.type] || Info;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type] || colors.info}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onDismiss} className="ml-2">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
