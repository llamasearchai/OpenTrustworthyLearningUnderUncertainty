/**
 * Errors Module
 *
 * Exports all error types, handlers, and utilities.
 *
 * @module lib/errors
 */

// Types
export {
  ErrorCodes,
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  createErrorFromResponse,
  isAppError,
  isNetworkError,
  isAuthenticationError,
  isAuthorizationError,
  isValidationError,
  isNotFoundError,
  isRateLimitError,
  isServerError,
  isRetryableError,
  type ErrorCode,
  type ErrorDetails,
  type ValidationErrorDetail,
  type AppErrorOptions,
  type NetworkErrorOptions,
  type AuthenticationErrorOptions,
  type AuthorizationErrorOptions,
  type ValidationErrorOptions,
  type NotFoundErrorOptions,
  type RateLimitErrorOptions,
  type ServerErrorOptions,
} from './types';

// Global Handler
export {
  setupGlobalErrorHandler,
  reportError,
  createErrorBoundaryHandler,
  setErrorReportingUser,
  setErrorReportingContext,
  logError,
  logWarning,
  logDebug,
  createSentryReporter,
  createDataDogReporter,
  type ErrorSeverity,
  type ErrorReport,
  type ErrorContext,
  type ErrorReporter,
  type GlobalErrorHandlerOptions,
} from './global';
