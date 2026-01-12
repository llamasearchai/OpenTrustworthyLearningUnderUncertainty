/**
 * Error Response Handlers
 *
 * MSW handlers for testing error scenarios.
 *
 * @module tests/mocks/handlers/error-handlers
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE = '/api';

// ============================================================================
// Types
// ============================================================================

export interface ErrorHandlerOptions {
  /** Response delay in ms */
  delay?: number;
  /** Custom error message */
  message?: string;
  /** Custom error code */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Response Helpers
// ============================================================================

/**
 * Creates a standardized error response.
 */
function createErrorResponse(
  status: number,
  defaultCode: string,
  defaultMessage: string,
  options: ErrorHandlerOptions = {}
) {
  return HttpResponse.json(
    {
      code: options.code ?? defaultCode,
      message: options.message ?? defaultMessage,
      details: options.details,
      request_id: `req_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
    },
    { status }
  );
}

// ============================================================================
// Factory Functions for Error Handlers
// ============================================================================

/**
 * Creates a 401 Unauthorized error handler.
 */
export function create401Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      401,
      'UNAUTHORIZED',
      'Authentication required. Please provide valid credentials.',
      options
    );
  });
}

/**
 * Creates a 403 Forbidden error handler.
 */
export function create403Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      403,
      'FORBIDDEN',
      'You do not have permission to access this resource.',
      options
    );
  });
}

/**
 * Creates a 404 Not Found error handler.
 */
export function create404Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      404,
      'NOT_FOUND',
      'The requested resource was not found.',
      options
    );
  });
}

/**
 * Creates a 422 Validation Error handler.
 */
export function create422Handler(
  path: string,
  options: ErrorHandlerOptions & {
    validationErrors?: Array<{ field: string; message: string }>;
  } = {}
) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    const validationErrors = options.validationErrors ?? [
      { field: 'email', message: 'Invalid email format' },
    ];

    return HttpResponse.json(
      {
        code: options.code ?? 'VALIDATION_ERROR',
        message: options.message ?? 'Validation failed',
        details: {
          errors: validationErrors,
          ...options.details,
        },
        request_id: `req_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
      },
      { status: 422 }
    );
  });
}

/**
 * Creates a 429 Rate Limit error handler.
 */
export function create429Handler(
  path: string,
  options: ErrorHandlerOptions & {
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    resetAt?: number;
  } = {}
) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    const retryAfter = options.retryAfter ?? 60;
    const resetAt = options.resetAt ?? Date.now() + retryAfter * 1000;

    return HttpResponse.json(
      {
        code: options.code ?? 'RATE_LIMITED',
        message: options.message ?? 'Too many requests. Please try again later.',
        details: {
          limit: options.limit ?? 100,
          remaining: options.remaining ?? 0,
          reset_at: resetAt,
          retry_after: retryAfter,
          ...options.details,
        },
        request_id: `req_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(options.limit ?? 100),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetAt),
        },
      }
    );
  });
}

/**
 * Creates a 500 Internal Server Error handler.
 */
export function create500Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again later.',
      options
    );
  });
}

/**
 * Creates a 502 Bad Gateway error handler.
 */
export function create502Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      502,
      'BAD_GATEWAY',
      'The server received an invalid response from the upstream server.',
      options
    );
  });
}

/**
 * Creates a 503 Service Unavailable error handler.
 */
export function create503Handler(
  path: string,
  options: ErrorHandlerOptions & { retryAfter?: number } = {}
) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    const retryAfter = options.retryAfter ?? 30;

    return HttpResponse.json(
      {
        code: options.code ?? 'SERVICE_UNAVAILABLE',
        message: options.message ?? 'The service is temporarily unavailable. Please try again later.',
        details: options.details,
        request_id: `req_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
      },
      {
        status: 503,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    );
  });
}

/**
 * Creates a 504 Gateway Timeout error handler.
 */
export function create504Handler(path: string, options: ErrorHandlerOptions = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    return createErrorResponse(
      504,
      'GATEWAY_TIMEOUT',
      'The server did not receive a timely response from the upstream server.',
      options
    );
  });
}

/**
 * Creates a network error handler (simulates connection failure).
 */
export function createNetworkErrorHandler(path: string, options: { delay?: number } = {}) {
  return http.all(`${API_BASE}${path}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    throw new Error('Network error: Failed to connect to server');
  });
}

/**
 * Creates a timeout handler (simulates request timeout).
 */
export function createTimeoutHandler(path: string, timeoutMs: number = 30000) {
  return http.all(`${API_BASE}${path}`, async () => {
    // Delay longer than typical timeout
    await delay(timeoutMs + 5000);
    return HttpResponse.json({ message: 'This should never be returned' });
  });
}

// ============================================================================
// Default Error Handlers
// ============================================================================

export const errorHandlers = [
  // Network error
  http.get(`${API_BASE}/error/network`, async () => {
    throw new Error('Network error');
  }),

  // 401 Unauthorized
  http.get(`${API_BASE}/error/401`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated. Please log in.',
      },
      { status: 401 }
    );
  }),

  // 403 Forbidden
  http.get(`${API_BASE}/error/403`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to perform this action.',
      },
      { status: 403 }
    );
  }),

  // 404 Not Found
  http.get(`${API_BASE}/error/404`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
      { status: 404 }
    );
  }),

  // 422 Validation Error
  http.get(`${API_BASE}/error/422`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password must be at least 8 characters' },
          ],
        },
      },
      { status: 422 }
    );
  }),

  // 429 Rate Limited
  http.get(`${API_BASE}/error/429`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before retrying.',
        details: {
          limit: 100,
          remaining: 0,
          reset_at: Date.now() + 60000,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }),

  // 500 Internal Server Error
  http.get(`${API_BASE}/error/500`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred.',
      },
      { status: 500 }
    );
  }),

  // 502 Bad Gateway
  http.get(`${API_BASE}/error/502`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'BAD_GATEWAY',
        message: 'The server received an invalid response.',
      },
      { status: 502 }
    );
  }),

  // 503 Service Unavailable
  http.get(`${API_BASE}/error/503`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The service is temporarily unavailable.',
      },
      {
        status: 503,
        headers: {
          'Retry-After': '30',
        },
      }
    );
  }),

  // 504 Gateway Timeout
  http.get(`${API_BASE}/error/504`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'GATEWAY_TIMEOUT',
        message: 'The request timed out.',
      },
      { status: 504 }
    );
  }),
];

// ============================================================================
// POST Error Handlers (for forms/mutations)
// ============================================================================

export const postErrorHandlers = [
  http.post(`${API_BASE}/error/401`, async () => {
    await delay(50);
    return HttpResponse.json(
      { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/error/403`, async () => {
    await delay(50);
    return HttpResponse.json(
      { code: 'FORBIDDEN', message: 'Access denied' },
      { status: 403 }
    );
  }),

  http.post(`${API_BASE}/error/422`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { errors: [{ field: 'data', message: 'Invalid data format' }] },
      },
      { status: 422 }
    );
  }),

  http.post(`${API_BASE}/error/429`, async () => {
    await delay(50);
    return HttpResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }),

  http.post(`${API_BASE}/error/500`, async () => {
    await delay(50);
    return HttpResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }),
];

// ============================================================================
// All Error Handlers
// ============================================================================

export const allErrorHandlers = [...errorHandlers, ...postErrorHandlers];

export default errorHandlers;
