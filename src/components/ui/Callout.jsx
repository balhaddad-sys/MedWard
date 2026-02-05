import { clsx } from 'clsx';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

const styles = {
  critical: {
    container: 'bg-critical-red-bg border-critical-red-border text-critical-red',
    icon: AlertTriangle,
  },
  warning: {
    container: 'bg-guarded-amber-bg border-guarded-amber-border text-guarded-amber',
    icon: AlertCircle,
  },
  info: {
    container: 'bg-info-blue-bg border-blue-200 text-info-blue',
    icon: Info,
  },
  success: {
    container: 'bg-stable-green-bg border-stable-green-border text-stable-green',
    icon: CheckCircle,
  },
};

export default function Callout({ type = 'info', title, children }) {
  const { container, icon: Icon } = styles[type];
  return (
    <div className={clsx('border rounded-lg p-3 flex gap-3', container)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold text-sm">{title}</p>}
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}
