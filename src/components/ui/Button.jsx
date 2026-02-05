import { forwardRef } from 'react';

/**
 * Button Component
 * Variants: primary, secondary, ghost, danger, success, warning, info
 * Sizes: xs, sm, md, lg
 * Full width: fullWidth prop
 * Icon-only: icon prop (renders square button)
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseClass = 'btn';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    warning: 'btn-warning',
    info: 'btn-info',
  };
  
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };
  
  const classes = [
    baseClass,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || '',
    fullWidth ? 'btn-full' : '',
    icon ? 'btn-icon' : '',
    disabled || loading ? 'btn-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner spinner-sm" aria-label="Loading" />
      ) : (
        <>
          {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * IconButton Component
 * For icon-only buttons with hover effects
 */
export const IconButton = forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  label,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'icon-btn',
    delete: 'icon-btn btn-delete',
    edit: 'icon-btn btn-edit',
    labs: 'icon-btn btn-labs',
    meds: 'icon-btn btn-meds',
    action: 'action-icon-btn icon-btn',
  };
  
  const sizeClasses = {
    sm: 'sm',
    md: '',
    lg: 'lg',
  };
  
  const classes = [
    variantClasses[variant] || variantClasses.default,
    sizeClasses[size] || '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';

/**
 * FAB (Floating Action Button)
 */
export const FAB = forwardRef(({
  children,
  position = 'bottom-right',
  className = '',
  label,
  ...props
}, ref) => {
  const positionStyles = {
    'bottom-right': { bottom: 'calc(var(--nav-height) + 20px)', right: '16px' },
    'bottom-left': { bottom: 'calc(var(--nav-height) + 20px)', left: '16px' },
    'top-right': { top: '76px', right: '16px' },
    'top-left': { top: '76px', left: '16px' },
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`fab ${className}`}
      style={positionStyles[position]}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});

FAB.displayName = 'FAB';

export default Button;
