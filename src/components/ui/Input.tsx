import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';

/* -------------------------------------------------------------------------- */
/*  Shared types                                                              */
/* -------------------------------------------------------------------------- */

export type InputVariant = 'default' | 'filled';

interface BaseFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
}

/* -------------------------------------------------------------------------- */
/*  Shared styles                                                             */
/* -------------------------------------------------------------------------- */

function fieldBaseClasses(variant: InputVariant, hasError: boolean) {
  return clsx(
    'block w-full rounded-lg text-sm text-gray-900 placeholder:text-gray-400',
    'transition-colors duration-150 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    variant === 'filled'
      ? 'bg-gray-100 border-transparent focus:bg-white'
      : 'bg-white border border-gray-300',
    hasError
      ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
      : 'focus:ring-blue-500/30 focus:border-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
  );
}

function LabelAndMessages({
  label,
  error,
  helperText,
  id,
}: {
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}) {
  return { labelEl: label, errorEl: error, helperEl: helperText, labelId: id };
}

/* -------------------------------------------------------------------------- */
/*  Input                                                                     */
/* -------------------------------------------------------------------------- */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'default',
      iconLeft,
      iconRight,
      className,
      id,
      ...rest
    },
    ref,
  ) => {
    const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {iconLeft && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
              {iconLeft}
            </span>
          )}

          <input
            ref={ref}
            id={fieldId}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
            }
            className={clsx(
              fieldBaseClasses(variant, !!error),
              'h-10 px-3',
              iconLeft && 'pl-10',
              iconRight && 'pr-10',
            )}
            {...rest}
          />

          {iconRight && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">
              {iconRight}
            </span>
          )}
        </div>

        {error && (
          <p id={`${fieldId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${fieldId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/*  Textarea                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, variant = 'default', className, id, ...rest }, ref) => {
    const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          className={clsx(
            fieldBaseClasses(variant, !!error),
            'px-3 py-2.5 min-h-[80px] resize-y',
          )}
          {...rest}
        />

        {error && (
          <p id={`${fieldId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${fieldId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {
  children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, variant = 'default', className, id, children, ...rest }, ref) => {
    const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined
          }
          className={clsx(
            fieldBaseClasses(variant, !!error),
            'h-10 px-3 pr-8 appearance-none',
            'bg-no-repeat bg-[length:16px_16px] bg-[right_0.5rem_center]',
            'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          )}
          {...rest}
        >
          {children}
        </select>

        {error && (
          <p id={`${fieldId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${fieldId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Input, Textarea, Select };
