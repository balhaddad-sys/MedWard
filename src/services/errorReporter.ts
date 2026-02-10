type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  patientId?: string
  [key: string]: unknown
}

interface ErrorReport {
  message: string
  severity: ErrorSeverity
  timestamp: string
  context: ErrorContext
  stack?: string
  userAgent: string
  url: string
}

class ErrorReporter {
  private buffer: ErrorReport[] = []
  private readonly MAX_BUFFER = 50

  report(
    error: unknown,
    severity: ErrorSeverity = 'error',
    context: ErrorContext = {}
  ): void {
    const report = this.buildReport(error, severity, context)

    // Always log to console in development
    if (import.meta.env.DEV) {
      const consoleFn = severity === 'fatal' || severity === 'error'
        ? console.error
        : severity === 'warning'
          ? console.warn
          : console.info
      consoleFn(`[${severity.toUpperCase()}]`, report.message, context)
    }

    this.buffer.push(report)
    if (this.buffer.length > this.MAX_BUFFER) {
      this.buffer.shift()
    }

    // In production, this is where you'd send to Sentry/LogRocket/etc:
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: context })
    // }
  }

  captureException(error: unknown, context: ErrorContext = {}): void {
    this.report(error, 'error', context)
  }

  captureMessage(message: string, severity: ErrorSeverity = 'info', context: ErrorContext = {}): void {
    this.report(new Error(message), severity, context)
  }

  getRecentErrors(): ErrorReport[] {
    return [...this.buffer]
  }

  private buildReport(
    error: unknown,
    severity: ErrorSeverity,
    context: ErrorContext
  ): ErrorReport {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error'

    const stack = error instanceof Error ? error.stack : undefined

    return {
      message,
      severity,
      timestamp: new Date().toISOString(),
      context,
      stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    }
  }
}

export const errorReporter = new ErrorReporter()
