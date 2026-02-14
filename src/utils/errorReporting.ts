/**
 * Error Reporting & Monitoring Utilities
 * Centralized error tracking for production monitoring
 */

interface ErrorContext {
  userId?: string
  userEmail?: string
  feature?: string
  action?: string
  patientId?: string
  metadata?: Record<string, unknown>
}

interface ErrorReport {
  timestamp: string
  error: {
    message: string
    stack?: string
    name: string
  }
  context: ErrorContext
  severity: 'info' | 'warning' | 'error' | 'critical'
  environment: string
}

/**
 * Report error to monitoring service
 */
export function reportError(
  error: Error,
  severity: 'info' | 'warning' | 'error' | 'critical',
  context: ErrorContext = {}
): void {
  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    severity,
    environment: import.meta.env.MODE || 'development',
  }

  // Console logging for development
  if (import.meta.env.DEV) {
    console.group(`🚨 Error Report [${severity.toUpperCase()}]`)
    console.error('Error:', error)
    console.log('Context:', context)
    console.log('Full Report:', report)
    console.groupEnd()
  }

  // Production: Send to monitoring service
  if (import.meta.env.PROD) {
    // Store in localStorage for admin review
    try {
      const errorLog = JSON.parse(localStorage.getItem('error-log') || '[]') as ErrorReport[]
      errorLog.push(report)
      // Keep only last 100 errors
      const trimmed = errorLog.slice(-100)
      localStorage.setItem('error-log', JSON.stringify(trimmed))
    } catch {
      // Ignore storage errors
    }

    // Log to console for Firebase logging to pick up
    console.error('[ERROR_REPORT]', JSON.stringify(report))
  }

  // Critical errors: alert user
  if (severity === 'critical') {
    // Could integrate with toast notification here
    console.error('CRITICAL ERROR:', error.message)
  }
}

/**
 * Report AI-specific errors with patient context
 */
export function reportAIError(
  error: Error,
  feature: 'chat' | 'lab-analysis' | 'handover' | 'sbar' | 'drug-info',
  patientId?: string,
  userId?: string
): void {
  reportError(error, 'error', {
    feature: `ai-${feature}`,
    patientId: patientId ? '[REDACTED]' : undefined, // Don't log actual patient IDs
    userId,
    metadata: {
      hasPatientContext: !!patientId,
    },
  })
}

/**
 * Report security events
 */
export function reportSecurityEvent(
  event: 'unauthorized-access' | 'permission-denied' | 'data-leak-attempt',
  context: ErrorContext
): void {
  const error = new Error(`Security event: ${event}`)
  reportError(error, 'critical', {
    ...context,
    feature: 'security',
    action: event,
  })
}

/**
 * Get error log for admin review
 */
export function getErrorLog(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem('error-log') || '[]') as ErrorReport[]
  } catch {
    return []
  }
}

/**
 * Clear error log
 */
export function clearErrorLog(): void {
  localStorage.removeItem('error-log')
}
