import { clsx } from 'clsx';

const variants = {
  critical: 'bg-critical-red-bg text-critical-red border-critical-red-border',
  watch: 'bg-guarded-amber-bg text-guarded-amber border-guarded-amber-border',
  stable: 'bg-stable-green-bg text-stable-green border-stable-green-border',
  info: 'bg-info-blue-bg text-info-blue border-blue-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

export default function Badge({ variant = 'neutral', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
