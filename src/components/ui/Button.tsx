import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-blue-600 text-white',
    'hover:bg-blue-700 active:bg-blue-800',
    'focus-visible:ring-blue-500/40',
    'disabled:bg-blue-300',
  ),
  secondary: clsx(
    'bg-white text-slate-700 border border-slate-300',
    'hover:bg-slate-50 active:bg-slate-100',
    'dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
    'dark:hover:bg-slate-700 dark:active:bg-slate-600',
    'focus-visible:ring-slate-400/30',
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200',
    'dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 dark:disabled:border-slate-700',
  ),
  ghost: clsx(
    'bg-transparent text-slate-600',
    'hover:bg-slate-100 active:bg-slate-200',
    'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:active:bg-slate-700',
    'focus-visible:ring-slate-400/30',
    'disabled:text-slate-300 disabled:bg-transparent',
    'dark:disabled:text-slate-600',
  ),
  danger: clsx(
    'bg-red-600 text-white',
    'hover:bg-red-700 active:bg-red-800',
    'focus-visible:ring-red-500/40',
    'disabled:bg-red-300',
  ),
  success: clsx(
    'bg-emerald-600 text-white',
    'hover:bg-emerald-700 active:bg-emerald-800',
    'focus-visible:ring-emerald-500/40',
    'disabled:bg-emerald-300',
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-base gap-2.5 rounded-lg',
};

const iconSizeMap: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          'select-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2
            size={iconSizeMap[size]}
            className="animate-spin shrink-0"
          />
        ) : (
          iconLeft && <span className="shrink-0">{iconLeft}</span>
        )}

        {children && <span>{children}</span>}

        {!loading && iconRight && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
