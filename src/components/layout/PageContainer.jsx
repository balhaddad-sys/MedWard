import { forwardRef, useState } from 'react';
import Spinner, { EmptyState } from '../ui/Spinner';

/**
 * PageContainer Component
 * Wrapper for page content with consistent padding and scroll behavior
 */
const PageContainer = forwardRef(({
  children,
  className = '',
  loading = false,
  loadingMessage = 'Loading...',
  error = null,
  onRetry,
  empty = false,
  emptyIcon,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  header,
  footer,
  noPadding = false,
  maxWidth = true,
  ...props
}, ref) => {
  // Loading state
  if (loading) {
    return (
      <div ref={ref} className={`page active ${className}`} {...props}>
        <div className="page-loading">
          <Spinner size="lg" />
          {loadingMessage && <p className="loading-text">{loadingMessage}</p>}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div ref={ref} className={`page active ${className}`} {...props}>
        <div className="page-error">
          <EmptyState
            title="Something went wrong"
            description={typeof error === 'string' ? error : 'An error occurred. Please try again.'}
            action={onRetry && (
              <button className="btn btn-primary" onClick={onRetry}>
                Try Again
              </button>
            )}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div ref={ref} className={`page active ${className}`} {...props}>
        {header}
        <div className="page-empty">
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div ref={ref} className={`page active ${className}`} {...props}>
      {header}
      <div className={`dash-content ${noPadding ? 'no-padding' : ''} ${maxWidth ? '' : 'no-max-width'}`}>
        {children}
      </div>
      {footer}
    </div>
  );
});

PageContainer.displayName = 'PageContainer';

/**
 * PageHeader - Consistent page header section
 */
export const PageHeader = ({
  title,
  subtitle,
  actions,
  backButton,
  onBack,
  className = '',
}) => {
  return (
    <div className={`page-header ${className}`}>
      <div className="page-header-content">
        {backButton && (
          <button className="page-back-btn" onClick={onBack} aria-label="Go back">
            ←
          </button>
        )}
        <div className="page-header-text">
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
};

/**
 * PageSection - Content section within a page
 */
export const PageSection = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsible) {
    return (
      <section className={`page-section collapsible ${collapsed ? 'collapsed' : ''} ${className}`}>
        <button 
          className="page-section-header clickable"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          <div className="page-section-title-group">
            {title && <h2 className="page-section-title">{title}</h2>}
            {subtitle && <p className="page-section-subtitle">{subtitle}</p>}
          </div>
          <span className={`collapse-icon ${collapsed ? '' : 'expanded'}`}>▼</span>
        </button>
        {!collapsed && (
          <div className="page-section-content">
            {children}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`page-section ${className}`}>
      {(title || actions) && (
        <div className="page-section-header">
          <div className="page-section-title-group">
            {title && <h2 className="page-section-title">{title}</h2>}
            {subtitle && <p className="page-section-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-section-actions">{actions}</div>}
        </div>
      )}
      <div className="page-section-content">
        {children}
      </div>
    </section>
  );
};

/**
 * ScrollArea - Scrollable content area with custom scrollbar
 */
export const ScrollArea = forwardRef(({
  children,
  className = '',
  maxHeight,
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={`scroll-area ${className}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

ScrollArea.displayName = 'ScrollArea';

export default PageContainer;
