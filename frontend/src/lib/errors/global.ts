/**
 * Global Error Handler
 *
 * Setup and configuration for global error handling and reporting.
 *
 * @module lib/errors/global
 */

import {
  AppError,
  ErrorCodes,
  isAppError,
  isAuthenticationError,
  isNetworkError,
} from './types';

// ============================================================================
// Types
// ============================================================================

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorReport {
  error: Error;
  severity: ErrorSeverity;
  timestamp: number;
  context: ErrorContext;
  handled: boolean;
}

export interface ErrorContext {
  url?: string;
  componentStack?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  extra?: Record<string, unknown>;
}

export interface ErrorReporter {
  report: (report: ErrorReport) => void;
  setUser: (userId: string | null) => void;
  setContext: (key: string, value: unknown) => void;
}

export interface GlobalErrorHandlerOptions {
  onError?: (error: Error, context: ErrorContext) => void;
  onUnhandledRejection?: (error: Error, context: ErrorContext) => void;
  reporter?: ErrorReporter;
  enabled?: boolean;
  ignoreNetworkErrors?: boolean;
  ignoreAuthErrors?: boolean;
}

// ============================================================================
// Console Reporter (Default)
// ============================================================================

class ConsoleReporter implements ErrorReporter {
  private userId: string | null = null;
  private context: Record<string, unknown> = {};

  report(report: ErrorReport): void {
    const { error, severity, timestamp, context, handled } = report;

    const prefix = handled ? '[Handled Error]' : '[Unhandled Error]';
    const time = new Date(timestamp).toISOString();

    console[severity === 'error' ? 'error' : 'warn'](
      `${prefix} ${time}`,
      '\nError:',
      error,
      '\nContext:',
      {
        ...context,
        ...this.context,
        userId: this.userId,
      }
    );
  }

  setUser(userId: string | null): void {
    this.userId = userId;
  }

  setContext(key: string, value: unknown): void {
    this.context[key] = value;
  }
}

// ============================================================================
// External Error Reporting Integration
// ============================================================================

/**
 * Sentry SDK interface (optional dependency)
 */
interface SentrySDK {
  captureException: (error: Error, options?: {
    level?: 'error' | 'warning' | 'info';
    contexts?: Record<string, unknown>;
    tags?: Record<string, string>;
  }) => string;
  setUser: (user: { id: string } | null) => void;
  setContext: (key: string, context: unknown) => void;
  init: (options: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
  }) => void;
}

/**
 * DataDog RUM SDK interface (optional dependency)
 */
interface DataDogRUM {
  addError: (error: Error, context?: Record<string, unknown>) => void;
  setUser: (user: { id: string } | null) => void;
  setRumGlobalContext: (context: Record<string, unknown>) => void;
  init: (options: {
    applicationId: string;
    clientToken: string;
    site?: string;
    service?: string;
    env?: string;
    version?: string;
    sampleRate?: number;
  }) => void;
}

/**
 * Create a Sentry-compatible error reporter
 * 
 * Full implementation that integrates with @sentry/browser if available.
 * Falls back gracefully if Sentry is not installed.
 * 
 * @param options - Sentry configuration options
 * @returns ErrorReporter instance
 * 
 * @example
 * ```tsx
 * // With Sentry installed
 * import * as Sentry from '@sentry/browser';
 * const reporter = createSentryReporter({ sentry: Sentry, dsn: 'your-dsn' });
 * 
 * // Without Sentry (graceful fallback)
 * const reporter = createSentryReporter();
 * ```
 */
export function createSentryReporter(options?: {
  sentry?: SentrySDK;
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}): ErrorReporter {
  const sentry = options?.sentry;
  const isSentryAvailable = typeof sentry !== 'undefined' && sentry !== null;

  // Initialize Sentry if provided
  if (isSentryAvailable && options?.dsn) {
    try {
      sentry.init({
        dsn: options.dsn,
        environment: options.environment || 'production',
        release: options.release,
        tracesSampleRate: options.tracesSampleRate ?? 1.0,
      });
    } catch (error) {
      console.warn('[Sentry] Failed to initialize:', error);
    }
  }

  return {
    report: (report: ErrorReport) => {
      if (isSentryAvailable) {
        try {
          const level = report.severity === 'error' ? 'error' 
            : report.severity === 'warning' ? 'warning' 
            : 'info';
          
          sentry.captureException(report.error, {
            level,
            contexts: {
              custom: {
                ...report.context,
                timestamp: report.timestamp,
                handled: report.handled,
              },
            },
            tags: {
              handled: String(report.handled),
              severity: report.severity,
            },
          });
        } catch (error) {
          console.warn('[Sentry] Failed to report error:', error);
          console.error('[Error]', report.error, report.context);
        }
      } else {
        // Fallback to console logging
        console.error('[Error Report]', {
          error: report.error,
          severity: report.severity,
          context: report.context,
          handled: report.handled,
          timestamp: report.timestamp,
        });
      }
    },
    setUser: (userId: string | null) => {
      if (isSentryAvailable) {
        try {
          sentry.setUser(userId ? { id: userId } : null);
        } catch (error) {
          console.warn('[Sentry] Failed to set user:', error);
        }
      } else {
        console.debug('[Sentry] Set user (not available):', userId);
      }
    },
    setContext: (key: string, value: unknown) => {
      if (isSentryAvailable) {
        try {
          sentry.setContext(key, value);
        } catch (error) {
          console.warn('[Sentry] Failed to set context:', error);
        }
      } else {
        console.debug('[Sentry] Set context (not available):', key, value);
      }
    },
  };
}

/**
 * Create a DataDog-compatible error reporter
 * 
 * Full implementation that integrates with @datadog/browser-rum if available.
 * Falls back gracefully if DataDog is not installed.
 * 
 * @param options - DataDog configuration options
 * @returns ErrorReporter instance
 * 
 * @example
 * ```tsx
 * // With DataDog installed
 * import { datadogRum } from '@datadog/browser-rum';
 * const reporter = createDataDogReporter({ 
 *   datadogRum, 
 *   applicationId: 'app-id',
 *   clientToken: 'client-token'
 * });
 * 
 * // Without DataDog (graceful fallback)
 * const reporter = createDataDogReporter();
 * ```
 */
export function createDataDogReporter(options?: {
  datadogRum?: DataDogRUM;
  applicationId?: string;
  clientToken?: string;
  site?: string;
  service?: string;
  env?: string;
  version?: string;
  sampleRate?: number;
}): ErrorReporter {
  const datadogRum = options?.datadogRum;
  const isDataDogAvailable = typeof datadogRum !== 'undefined' && datadogRum !== null;

  // Initialize DataDog RUM if provided
  if (isDataDogAvailable && options?.applicationId && options?.clientToken) {
    try {
      datadogRum.init({
        applicationId: options.applicationId,
        clientToken: options.clientToken,
        site: options.site || 'datadoghq.com',
        service: options.service || 'opentlu-frontend',
        env: options.env || 'production',
        version: options.version,
        sampleRate: options.sampleRate ?? 100,
      });
    } catch (error) {
      console.warn('[DataDog] Failed to initialize:', error);
    }
  }

  return {
    report: (report: ErrorReport) => {
      if (isDataDogAvailable) {
        try {
          datadogRum.addError(report.error, {
            ...report.context,
            severity: report.severity,
            handled: report.handled,
            timestamp: report.timestamp,
          });
        } catch (error) {
          console.warn('[DataDog] Failed to report error:', error);
          console.error('[Error]', report.error, report.context);
        }
      } else {
        // Fallback to console logging
        console.error('[Error Report]', {
          error: report.error,
          severity: report.severity,
          context: report.context,
          handled: report.handled,
          timestamp: report.timestamp,
        });
      }
    },
    setUser: (userId: string | null) => {
      if (isDataDogAvailable) {
        try {
          datadogRum.setUser(userId ? { id: userId } : null);
        } catch (error) {
          console.warn('[DataDog] Failed to set user:', error);
        }
      } else {
        console.debug('[DataDog] Set user (not available):', userId);
      }
    },
    setContext: (key: string, value: unknown) => {
      if (isDataDogAvailable) {
        try {
          datadogRum.setRumGlobalContext({ [key]: value });
        } catch (error) {
          console.warn('[DataDog] Failed to set context:', error);
        }
      } else {
        console.debug('[DataDog] Set context (not available):', key, value);
      }
    },
  };
}

// ============================================================================
// Global Error Handler
// ============================================================================

let isSetup = false;
let globalReporter: ErrorReporter = new ConsoleReporter();
let globalOptions: GlobalErrorHandlerOptions = {};

function getSeverity(error: Error): ErrorSeverity {
  if (isAppError(error)) {
    if (error.statusCode >= 500) return 'error';
    if (error.statusCode >= 400) return 'warning';
  }
  return 'error';
}

function getErrorContext(): ErrorContext {
  const context: ErrorContext = {
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    context.url = window.location.href;
    context.userAgent = navigator.userAgent;
  }

  return context;
}

function shouldIgnoreError(error: Error): boolean {
  if (globalOptions.ignoreNetworkErrors && isNetworkError(error)) {
    return true;
  }

  if (globalOptions.ignoreAuthErrors && isAuthenticationError(error)) {
    return true;
  }

  return false;
}

function handleError(error: Error, context: Partial<ErrorContext> = {}, handled = false): void {
  if (!globalOptions.enabled) return;
  if (shouldIgnoreError(error)) return;

  const fullContext: ErrorContext = {
    ...getErrorContext(),
    ...context,
  };

  const report: ErrorReport = {
    error,
    severity: getSeverity(error),
    timestamp: Date.now(),
    context: fullContext,
    handled,
  };

  globalReporter.report(report);

  if (!handled) {
    globalOptions.onError?.(error, fullContext);
  }
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new AppError({
          code: ErrorCodes.UNKNOWN_ERROR,
          message: String(event.reason),
        });

  const context = getErrorContext();
  handleError(error, context, false);
  globalOptions.onUnhandledRejection?.(error, context);
}

function handleWindowError(event: ErrorEvent): void {
  const error = event.error instanceof Error
    ? event.error
    : new AppError({
        code: ErrorCodes.UNKNOWN_ERROR,
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

  handleError(error, getErrorContext(), false);
}

/**
 * Setup global error handlers
 *
 * @example
 * ```tsx
 * // In your app initialization
 * setupGlobalErrorHandler({
 *   enabled: process.env.NODE_ENV === 'production',
 *   reporter: createSentryReporter(),
 *   onError: (error) => {
 *     toast.error('An unexpected error occurred');
 *   },
 * });
 * ```
 */
export function setupGlobalErrorHandler(options: GlobalErrorHandlerOptions = {}): () => void {
  if (isSetup) {
    console.warn('Global error handler is already setup. Call cleanup first.');
    return () => {};
  }

  globalOptions = {
    enabled: true,
    ignoreNetworkErrors: false,
    ignoreAuthErrors: false,
    ...options,
  };

  if (options.reporter) {
    globalReporter = options.reporter;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  }

  isSetup = true;

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }
    isSetup = false;
    globalOptions = {};
    globalReporter = new ConsoleReporter();
  };
}

// ============================================================================
// Manual Error Reporting
// ============================================================================

/**
 * Manually report an error
 *
 * @example
 * ```tsx
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   reportError(error, { extra: { operation: 'riskyOperation' } });
 *   // Handle error gracefully
 * }
 * ```
 */
export function reportError(
  error: Error | unknown,
  context: Partial<ErrorContext> = {}
): void {
  const normalizedError = error instanceof Error
    ? error
    : new AppError({
        code: ErrorCodes.UNKNOWN_ERROR,
        message: String(error),
      });

  handleError(normalizedError, context, true);
}

/**
 * Create an error boundary handler for React components
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: { componentStack?: string | null }) => {
    reportError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      extra: {
        component: componentName,
      },
    });
  };
}

/**
 * Set the current user for error reporting
 */
export function setErrorReportingUser(userId: string | null): void {
  globalReporter.setUser(userId);
}

/**
 * Set additional context for error reporting
 */
export function setErrorReportingContext(key: string, value: unknown): void {
  globalReporter.setContext(key, value);
}

// ============================================================================
// Error Logging Utilities
// ============================================================================

/**
 * Log an error without reporting to external services
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Error]', error.message, {
    error,
    context,
    stack: error.stack,
  });
}

/**
 * Log a warning
 */
export function logWarning(message: string, context?: Record<string, unknown>): void {
  console.warn('[Warning]', message, context);
}

/**
 * Log debug information (only in development)
 */
export function logDebug(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.debug('[Debug]', message, data);
  }
}
