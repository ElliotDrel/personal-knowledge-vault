/**
 * Logging utilities for short-form video processing Edge Function
 * Provides structured logging with context information
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogContext = Record<string, unknown>

/**
 * Base logging function with structured output
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    function: 'short-form',
    ...context,
  }

  // In Edge Functions, console logs are captured by Supabase
  console.log(JSON.stringify(logEntry))
}

/**
 * Log debug information (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development'
  if (isDevelopment) {
    log('debug', message, context)
  }
}

/**
 * Log general information
 */
export function logInfo(message: string, context?: LogContext): void {
  log('info', message, context)
}

/**
 * Log warnings
 */
export function logWarn(message: string, context?: LogContext): void {
  log('warn', message, context)
}

/**
 * Log errors
 */
export function logError(message: string, context?: LogContext): void {
  log('error', message, context)
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, durationMs: number, context?: LogContext): void {
  log('info', `Performance: ${operation}`, {
    ...context,
    operation,
    durationMs,
    type: 'performance',
  })
}

/**
 * Log external API calls
 */
export function logApiCall(
  service: string,
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  log('info', `API Call: ${service}`, {
    ...context,
    service,
    endpoint,
    method,
    statusCode,
    durationMs,
    type: 'api_call',
  })
}

/**
 * Log job status changes
 */
export function logJobUpdate(
  jobId: string,
  userId: string,
  oldStatus: string,
  newStatus: string,
  context?: LogContext
): void {
  log('info', `Job status changed: ${oldStatus} -> ${newStatus}`, {
    ...context,
    jobId,
    userId,
    oldStatus,
    newStatus,
    type: 'job_update',
  })
}

/**
 * Log user actions
 */
export function logUserAction(
  userId: string,
  action: string,
  resource?: string,
  context?: LogContext
): void {
  log('info', `User action: ${action}`, {
    ...context,
    userId,
    action,
    resource,
    type: 'user_action',
  })
}

/**
 * Timer utility for measuring execution time
 */
export class Timer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return performance.now() - this.startTime
  }

  /**
   * Log the elapsed time for an operation
   */
  logElapsed(operation: string, context?: LogContext): void {
    const elapsed = this.elapsed()
    logPerformance(operation, elapsed, context)
  }
}

/**
 * Utility to safely log sensitive data (removes or masks sensitive fields)
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }

  const sensitiveFields = ['password', 'token', 'key', 'secret', 'apikey', 'authorization']
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field))

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = value.length > 0 ? `${value.substring(0, 4)}...` : ''
    } else {
      sanitized[key] = sanitizeForLogging(value)
    }
  }

  return sanitized
}
