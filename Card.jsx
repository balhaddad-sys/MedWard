import { forwardRef } from 'react';

/**
 * Card Component
 * Base card container with optional header and footer
 */
const Card = forwardRef(({
  children,
  className = '',
  variant = 'default',
  clickable = false,
  onClick,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'card',
    section: 'section-card',
    stat: 'stat-card',
    unit: 'unit-card',
  };

  const classes = [
    variantClasses[variant] || variantClasses.default,
    clickable ? 'clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

/**
 * SectionCard - Card with header section
 */
export const SectionCard = forwardRef(({
  children,
  title,
  icon,
  actions,
  className = '',
  bodyClassName = '',
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`section-card ${className}`} {...props}>
      {(title || actions) && (
        <div className="section-header">
          <div className="section-title">
            {icon && <span className="section-icon">{icon}</span>}
            {title}
          </div>
          {actions && <div className="section-actions">{actions}</div>}
        </div>
      )}
      <div className={`section-body ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
});

SectionCard.displayName = 'SectionCard';

/**
 * StatCard - Statistics display card
 */
export const StatCard = forwardRef(({
  value,
  label,
  active = false,
  onClick,
  className = '',
  color,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`stat-card ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      {...props}
    >
      <div className="stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

/**
 * StatsGrid - Grid container for stat cards
 */
export const StatsGrid = ({ children, className = '' }) => {
  return (
    <div className={`stats-grid ${className}`}>
      {children}
    </div>
  );
};

/**
 * UnitCard - Ward/Unit selection card
 */
export const UnitCard = forwardRef(({
  icon,
  name,
  description,
  color,
  onClick,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`unit-card ${className}`}
      style={{ '--unit-color': color }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      {...props}
    >
      <div className="unit-card-icon">{icon}</div>
      <div className="unit-card-name">{name}</div>
      {description && <div className="unit-card-desc">{description}</div>}
    </div>
  );
});

UnitCard.displayName = 'UnitCard';

/**
 * DateBanner - Date display banner
 */
export const DateBanner = ({ date, icon, className = '' }) => {
  const formattedDate = date instanceof Date 
    ? date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    : date;

  return (
    <div className={`date-banner ${className}`}>
      {icon && <span className="date-icon">{icon}</span>}
      {formattedDate}
    </div>
  );
};

/**
 * WardSection - Ward grouping container
 */
export const WardSection = ({ title, count, color, children, className = '' }) => {
  return (
    <div className={`ward-section ${className}`}>
      <div className="ward-header" style={{ borderLeftColor: color || 'var(--primary)' }}>
        <div className="ward-title">{title}</div>
        {count !== undefined && <div className="ward-count">{count}</div>}
      </div>
      <div className="ward-patients">
        {children}
      </div>
    </div>
  );
};

export default Card;
