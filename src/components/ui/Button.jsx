import { clsx } from 'clsx';

const variants = {
  primary: 'bg-trust-blue text-white hover:bg-trust-blue-light',
  secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  danger: 'bg-critical-red text-white hover:bg-red-700',
  ghost: 'text-neutral-600 hover:bg-neutral-100',
};

export default function Button({ variant = 'primary', children, className, loading, ...props }) {
  return (
    <button
      className={clsx(
        'px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50',
        variants[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
