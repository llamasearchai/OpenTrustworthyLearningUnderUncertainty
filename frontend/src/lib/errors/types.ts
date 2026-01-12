/**
 * Error Types
 *
 * Custom error classes for the application with proper typing and error codes.
 *
 * @module lib/errors/types
 */

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  OFFLINE: 'OFFLINE',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',

  // Application errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Error Details
// ============================================================================

export interface ErrorDetails {
  [key: string]: unknown;
  field?: string;
  reason?: string;
  suggestion?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

// ============================================================================
// AppError - Base Error Class
// ============================================================================

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: ErrorDetails;
  isRetryable?: boolean;
  cause?: Error;
  requestId?: string;
}

/**
 * Base application error class
 *
 * @example
 * ```tsx
 * throw new AppError({
 *   code: ErrorCodes.VALIDATION_ERROR,
 *   message: 'Invalid email format',
 *   statusCode: 400,
 *   details: { field: 'email', value: 'invalid-email' },
 * });
 * ```
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: ErrorDetails;
  readonly isRetryable: boolean;
  readonly requestId?: string;
  readonly timestamp: number;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details ?? {};
    this.isRetryable = options.isRetryable ?? false;
    this.requestId = options.requestId;
    this.timestamp = Date.now();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      isRetryable: this.isRetryable,
      requestId: this.requestId,
      timestamp: this.timestamp,
    };
  }

  static fromError(error: Error, code: ErrorCode = ErrorCodes.UNKNOWN_ERROR): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError({
      code,
      message: error.message,
      cause: error,
    });
  }
}

// ============================================================================
// NetworkError
// ============================================================================

export interface NetworkErrorOptions {
  message?: string;
  details?: ErrorDetails;
  cause?: Error;
}

/**
 * Error for network-related issues
 */
export class NetworkError extends AppError {
  constructor(options: NetworkErrorOptions = {}) {
    super({
      code: ErrorCodes.NETWORK_ERROR,
      message: options.message ?? 'Network request failed',
      statusCode: 0,
      details: options.details,
      isRetryable: true,
      cause: options.cause,
    });
    this.name = 'NetworkError';
  }

  static fromFetchError(error: Error): NetworkError {
    let message = 'Network request failed';

    if (error.name === 'AbortError') {
      message = 'Request was cancelled';
    } else if (error.message.includes('Failed to fetch')) {
      message = 'Unable to connect to the server';
    } else if (error.message.includes('NetworkError')) {
      message = 'Network connection lost';
    }

    return new NetworkError({
      message,
      cause: error,
    });
  }
}

// ============================================================================
// AuthenticationError
// ============================================================================

export interface AuthenticationErrorOptions {
  message?: string;
  code?: typeof ErrorCodes.UNAUTHORIZED | typeof ErrorCodes.TOKEN_EXPIRED | typeof ErrorCodes.INVALID_CREDENTIALS;
  details?: ErrorDetails;
  requestId?: string;
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(options: AuthenticationErrorOptions = {}) {
    super({
      code: options.code ?? ErrorCodes.UNAUTHORIZED,
      message: options.message ?? 'Authentication required',
      statusCode: 401,
      details: options.details,
      isRetryable: false,
      requestId: options.requestId,
    });
    this.name = 'AuthenticationError';
  }

  get isTokenExpired(): boolean {
    return this.code === ErrorCodes.TOKEN_EXPIRED;
  }
}

// ============================================================================
// AuthorizationError
// ============================================================================

export interface AuthorizationErrorOptions {
  message?: string;
  resource?: string;
  action?: string;
  details?: ErrorDetails;
  requestId?: string;
}

/**
 * Error for authorization/permission failures
 */
export class AuthorizationError extends AppError {
  readonly resource?: string;
  readonly action?: string;

  constructor(options: AuthorizationErrorOptions = {}) {
    super({
      code: ErrorCodes.FORBIDDEN,
      message: options.message ?? 'Access denied',
      statusCode: 403,
      details: {
        ...options.details,
        resource: options.resource,
        action: options.action,
      },
      isRetryable: false,
      requestId: options.requestId,
    });
    this.name = 'AuthorizationError';
    this.resource = options.resource;
    this.action = options.action;
  }
}

// ============================================================================
// ValidationError
// ============================================================================

export interface ValidationErrorOptions {
  message?: string;
  errors?: ValidationErrorDetail[];
  details?: ErrorDetails;
  requestId?: string;
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  readonly errors: ValidationErrorDetail[];

  constructor(options: ValidationErrorOptions = {}) {
    const errors = options.errors ?? [];
    const message = options.message ?? ValidationError.formatMessage(errors);

    super({
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      statusCode: 400,
      details: {
        ...options.details,
        errors,
      },
      isRetryable: false,
      requestId: options.requestId,
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }

  private static formatMessage(errors: ValidationErrorDetail[]): string {
    if (errors.length === 0) {
      return 'Validation failed';
    }

    if (errors.length === 1) {
      return errors[0].message;
    }

    return `Validation failed with ${errors.length} errors`;
  }

  getFieldError(field: string): ValidationErrorDetail | undefined {
    return this.errors.find((error) => error.field === field);
  }

  hasFieldError(field: string): boolean {
    return this.errors.some((error) => error.field === field);
  }

  toFieldErrors(): Record<string, string> {
    return this.errors.reduce(
      (acc, error) => {
        acc[error.field] = error.message;
        return acc;
      },
      {} as Record<string, string>
    );
  }
}

// ============================================================================
// NotFoundError
// ============================================================================

export interface NotFoundErrorOptions {
  message?: string;
  resource?: string;
  resourceId?: string;
  details?: ErrorDetails;
  requestId?: string;
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  readonly resource?: string;
  readonly resourceId?: string;

  constructor(options: NotFoundErrorOptions = {}) {
    const message = options.message ?? NotFoundError.formatMessage(options);

    super({
      code: ErrorCodes.NOT_FOUND,
      message,
      statusCode: 404,
      details: {
        ...options.details,
        resource: options.resource,
        resourceId: options.resourceId,
      },
      isRetryable: false,
      requestId: options.requestId,
    });
    this.name = 'NotFoundError';
    this.resource = options.resource;
    this.resourceId = options.resourceId;
  }

  private static formatMessage(options: NotFoundErrorOptions): string {
    if (options.resource && options.resourceId) {
      return `${options.resource} with ID "${options.resourceId}" not found`;
    }
    if (options.resource) {
      return `${options.resource} not found`;
    }
    return 'Resource not found';
  }
}

// ============================================================================
// RateLimitError
// ============================================================================

export interface RateLimitErrorOptions {
  message?: string;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  details?: ErrorDetails;
  requestId?: string;
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends AppError {
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;

  constructor(options: RateLimitErrorOptions = {}) {
    super({
      code: ErrorCodes.RATE_LIMITED,
      message: options.message ?? 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
      details: {
        ...options.details,
        retryAfter: options.retryAfter,
        limit: options.limit,
        remaining: options.remaining,
      },
      isRetryable: true,
      requestId: options.requestId,
    });
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter;
    this.limit = options.limit;
    this.remaining = options.remaining;
  }

  getRetryDelay(): number {
    return this.retryAfter ?? 60000; // Default to 1 minute
  }
}

// ============================================================================
// ServerError
// ============================================================================

export interface ServerErrorOptions {
  message?: string;
  code?: typeof ErrorCodes.INTERNAL_SERVER_ERROR | typeof ErrorCodes.SERVICE_UNAVAILABLE | typeof ErrorCodes.GATEWAY_TIMEOUT;
  statusCode?: number;
  details?: ErrorDetails;
  requestId?: string;
  cause?: Error;
}

/**
 * Error for server-side failures
 */
export class ServerError extends AppError {
  constructor(options: ServerErrorOptions = {}) {
    super({
      code: options.code ?? ErrorCodes.INTERNAL_SERVER_ERROR,
      message: options.message ?? 'An unexpected server error occurred',
      statusCode: options.statusCode ?? 500,
      details: options.details,
      isRetryable: true,
      requestId: options.requestId,
      cause: options.cause,
    });
    this.name = 'ServerError';
  }

  static serviceUnavailable(options: Omit<ServerErrorOptions, 'code' | 'statusCode'> = {}): ServerError {
    return new ServerError({
      ...options,
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message: options.message ?? 'Service is temporarily unavailable',
      statusCode: 503,
    });
  }

  static gatewayTimeout(options: Omit<ServerErrorOptions, 'code' | 'statusCode'> = {}): ServerError {
    return new ServerError({
      ...options,
      code: ErrorCodes.GATEWAY_TIMEOUT,
      message: options.message ?? 'Gateway timeout',
      statusCode: 504,
    });
  }
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Create an appropriate error instance from an HTTP response
 */
export function createErrorFromResponse(
  statusCode: number,
  body: {
    code?: string;
    message?: string;
    details?: ErrorDetails;
    errors?: ValidationErrorDetail[];
    request_id?: string;
  }
): AppError {
  const requestId = body.request_id;

  switch (statusCode) {
    case 400:
      if (body.errors) {
        return new ValidationError({
          message: body.message,
          errors: body.errors,
          requestId,
        });
      }
      return new ValidationError({
        message: body.message ?? 'Bad request',
        requestId,
      });

    case 401:
      return new AuthenticationError({
        message: body.message,
        code: body.code === 'TOKEN_EXPIRED' ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.UNAUTHORIZED,
        requestId,
      });

    case 403:
      return new AuthorizationError({
        message: body.message,
        requestId,
      });

    case 404:
      return new NotFoundError({
        message: body.message,
        requestId,
      });

    case 429:
      return new RateLimitError({
        message: body.message,
        retryAfter: body.details?.retryAfter as number | undefined,
        requestId,
      });

    case 500:
      return new ServerError({
        message: body.message,
        requestId,
      });

    case 502:
    case 503:
      return ServerError.serviceUnavailable({
        message: body.message,
        requestId,
      });

    case 504:
      return ServerError.gatewayTimeout({
        message: body.message,
        requestId,
      });

    default:
      return new AppError({
        code: (body.code as ErrorCode) ?? ErrorCodes.UNKNOWN_ERROR,
        message: body.message ?? `HTTP ${statusCode} error`,
        statusCode,
        details: body.details,
        isRetryable: statusCode >= 500,
        requestId,
      });
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError;
}

export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isRetryable;
  }
  return false;
}
