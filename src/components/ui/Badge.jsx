import { forwardRef } from 'react';

/**
 * Badge Component
 * Colors: primary, success, danger, warning, info, teal, purple, rose, emerald
 * Sizes: sm, md, lg
 */
const Badge = forwardRef(({
  children,
  color = 'primary',
  size = 'md',
  variant = 'filled',
  pill = false,
  dot = false,
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  };

  const classes = [
    'badge',
    `badge-${color}`,
    sizeClasses[size] || '',
    variant === 'outline' ? 'badge-outline' : '',
    pill ? 'badge-pill' : '',
    dot ? 'badge-dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span ref={ref} className={classes} {...props}>
      {dot && <span className="badge-dot-indicator" />}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

/**
 * StatusBadge - Patient status indicator
 * Status: critical, guarded, stable, discharged
 */
export const StatusBadge = forwardRef(({
  status,
  showLabel = true,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const statusConfig = {
    critical: {
      color: 'rose',
      label: 'Critical',
      dot: true,
    },
    guarded: {
      color: 'warning',
      label: 'Guarded',
      dot: true,
    },
    stable: {
      color: 'emerald',
      label: 'Stable',
      dot: true,
    },
    discharged: {
      color: 'info',
      label: 'Discharged',
      dot: false,
    },
    pending: {
      color: 'purple',
      label: 'Pending',
      dot: true,
    },
  };

  const config = statusConfig[status] || statusConfig.stable;

  return (
    <Badge
      ref={ref}
      color={config.color}
      size={size}
      dot={config.dot}
      className={`status-badge status-${status} ${className}`}
      {...props}
    >
      {showLabel && config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * MedicationStatusBadge - Medication status indicator
 */
export const MedicationStatusBadge = forwardRef(({
  status,
  className = '',
  ...props
}, ref) => {
  const statusConfig = {
    active: {
      color: 'emerald',
      label: 'Active',
    },
    held: {
      color: 'warning',
      label: 'Held',
    },
    discontinued: {
      color: 'rose',
      label: 'D/C',
    },
    prn: {
      color: 'info',
      label: 'PRN',
    },
    stat: {
      color: 'purple',
      label: 'STAT',
    },
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <Badge
      ref={ref}
      color={config.color}
      size="sm"
      className={`med-status ${className}`}
      {...props}
    >
      {config.label}
    </Badge>
  );
});

MedicationStatusBadge.displayName = 'MedicationStatusBadge';

/**
 * PriorityBadge - Priority indicator
 */
export const PriorityBadge = forwardRef(({
  priority,
  className = '',
  ...props
}, ref) => {
  const priorityConfig = {
    urgent: {
      color: 'rose',
      label: 'Urgent',
    },
    high: {
      color: 'warning',
      label: 'High',
    },
    routine: {
      color: 'info',
      label: 'Routine',
    },
    low: {
      color: 'primary',
      label: 'Low',
    },
  };

  const config = priorityConfig[priority] || priorityConfig.routine;

  return (
    <Badge
      ref={ref}
      color={config.color}
      size="sm"
      className={`priority-badge ${className}`}
      {...props}
    >
      {config.label}
    </Badge>
  );
});

PriorityBadge.displayName = 'PriorityBadge';

/**
 * CountBadge - Notification count badge
 */
export const CountBadge = forwardRef(({
  count,
  max = 99,
  showZero = false,
  color = 'danger',
  className = '',
  ...props
}, ref) => {
  if (!showZero && count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      ref={ref}
      color={color}
      size="sm"
      pill
      className={`count-badge ${className}`}
      {...props}
    >
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';

/**
 * TagBadge - Removable tag
 */
export const TagBadge = forwardRef(({
  children,
  onRemove,
  color = 'primary',
  className = '',
  ...props
}, ref) => {
  return (
    <Badge
      ref={ref}
      color={color}
      className={`tag-badge ${className}`}
      {...props}
    >
      {children}
      {onRemove && (
        <button 
          type="button"
          className="tag-remove" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </Badge>
  );
});

TagBadge.displayName = 'TagBadge';

export default Badge;
