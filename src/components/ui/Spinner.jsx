/**
 * Spinner Component
 * Sizes: sm, md, lg
 */
const Spinner = ({ 
  size = 'md', 
  color,
  className = '',
  label = 'Loading...',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'spinner-sm',
    md: '',
    lg: 'spinner-lg',
  };

  const style = color ? { borderTopColor: color } : undefined;

  return (
    <span 
      className={`spinner ${sizeClasses[size] || ''} ${className}`}
      style={style}
      role="status"
      aria-label={label}
      {...props}
    />
  );
};

/**
 * LoadingOverlay - Full-screen or container loading overlay
 */
export const LoadingOverlay = ({ 
  message = 'Loading...', 
  fullScreen = false,
  transparent = false,
  className = '',
}) => {
  const classes = [
    'loading-overlay',
    fullScreen ? 'loading-fullscreen' : '',
    transparent ? 'loading-transparent' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="loading-content">
        <Spinner size="lg" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

/**
 * SkeletonLoader - Content placeholder
 */
export const Skeleton = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) => {
  const variantClasses = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    card: 'skeleton-card',
  };

  const style = {
    width: width,
    height: height,
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div 
      key={i}
      className={`skeleton ${variantClasses[variant] || variantClasses.text} ${className}`}
      style={style}
      aria-hidden="true"
    />
  ));

  return count > 1 ? <>{skeletons}</> : skeletons[0];
};

/**
 * PatientCardSkeleton - Skeleton for patient cards
 */
export const PatientCardSkeleton = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="patient-card-skeleton">
          <div className="skeleton-header">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="skeleton-info">
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
          <div className="skeleton-body">
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={14} />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * DotsLoader - Three bouncing dots
 */
export const DotsLoader = ({ 
  color, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'dots-sm',
    md: '',
    lg: 'dots-lg',
  };

  return (
    <div 
      className={`dots-loader ${sizeClasses[size]} ${className}`}
      style={color ? { '--dot-color': color } : undefined}
      role="status"
      aria-label="Loading"
    >
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
};

/**
 * ProgressBar - Linear progress indicator
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  showLabel = false,
  color,
  height = 4,
  animated = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div 
      className={`progress-container ${className}`}
      style={{ height: `${height}px` }}
    >
      <div 
        className={`progress-bar ${animated ? 'progress-animated' : ''}`}
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color,
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
      {showLabel && (
        <span className="progress-label">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

/**
 * PulseIndicator - Pulsing status indicator
 */
export const PulseIndicator = ({
  color = 'var(--success)',
  size = 8,
  className = '',
}) => {
  return (
    <span 
      className={`pulse-indicator ${className}`}
      style={{ 
        '--pulse-color': color,
        width: size,
        height: size,
      }}
      aria-hidden="true"
    />
  );
};

/**
 * EmptyState - No data placeholder
 */
export const EmptyState = ({
  icon,
  title = 'No data',
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-icon">{icon}</div>}
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default Spinner;
