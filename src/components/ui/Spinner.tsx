import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

const textSizeMap: Record<SpinnerSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

function Spinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <div
      role="status"
      className={clsx('flex flex-col items-center justify-center gap-2', className)}
    >
      <Loader2 size={sizeMap[size]} className="animate-spin text-blue-600" />
      {label && (
        <span className={clsx('text-gray-500', textSizeMap[size])}>{label}</span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

export { Spinner };
