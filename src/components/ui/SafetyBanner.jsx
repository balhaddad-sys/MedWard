import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export default function SafetyBanner({ message, level = 'warning' }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const colors = {
    critical: 'bg-critical-red-bg border-critical-red text-critical-red',
    warning: 'bg-guarded-amber-bg border-guarded-amber text-guarded-amber',
  };

  return (
    <div
      className={`${colors[level]} border-b-2 px-4 py-3 flex items-center justify-between rounded-lg mb-4`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-bold uppercase">{message}</span>
      </div>
      <button onClick={() => setDismissed(true)}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
