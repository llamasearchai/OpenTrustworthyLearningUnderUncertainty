/**
 * MSW Request Handlers
 *
 * Consolidated mock API handlers for testing.
 *
 * @module tests/mocks/handlers
 */

import { http, HttpResponse, delay, DefaultBodyType } from 'msw';

// ============================================================================
// Import Handler Modules
// ============================================================================

import { uncertaintyHandlers } from './uncertainty-handlers';
import { evaluationHandlers } from './evaluation-handlers';
import { safetyHandlers } from './safety-handlers';
import { activeLearningHandlers, oodHandlers } from './active-learning-handlers';
import { errorHandlers, allErrorHandlers, postErrorHandlers } from './error-handlers';

// ============================================================================
// Re-export Individual Handler Modules
// ============================================================================

export { uncertaintyHandlers } from './uncertainty-handlers';
export { evaluationHandlers } from './evaluation-handlers';
export { safetyHandlers } from './safety-handlers';
export { activeLearningHandlers, oodHandlers } from './active-learning-handlers';
export {
  errorHandlers,
  allErrorHandlers,
  postErrorHandlers,
  create401Handler,
  create403Handler,
  create404Handler,
  create422Handler,
  create429Handler,
  create500Handler,
  create502Handler,
  create503Handler,
  create504Handler,
  createNetworkErrorHandler,
  createTimeoutHandler,
} from './error-handlers';

// ============================================================================
// Re-export Factory Functions
// ============================================================================

export {
  createEstimateHandler,
  createHistoryHandler,
  createDecomposeHandler,
  createCalibrationHandler,
  createBatchEstimateHandler,
  createMethodsHandler,
} from './uncertainty-handlers';

export {
  createScenariosHandler,
  createScenarioByIdHandler,
  createCreateScenarioHandler,
  createUpdateScenarioHandler,
  createDeleteScenarioHandler,
  createEvaluateHandler,
  createEvaluationResultsHandler,
  createAggregateHandler,
} from './evaluation-handlers';

export {
  createMonitorsHandler,
  createMonitorByIdHandler,
  createMonitorHistoryHandler,
  createMitigationStateHandler,
  createSetMitigationStateHandler,
  createSafetyFilterHandler,
  createSafetyTimelineHandler,
  createConstraintsHandler,
  createEnvelopeHandler,
} from './safety-handlers';

export {
  createSamplesHandler,
  createSampleByIdHandler,
  createAcquisitionSelectHandler,
  createAcquisitionConfigHandler,
  createUpdateAcquisitionConfigHandler,
  createLabelSamplesHandler,
  createAcquisitionHistoryHandler,
  createOODDetectHandler,
  createOODBatchDetectHandler,
  createOODThresholdHandler,
  createSetOODThresholdHandler,
} from './active-learning-handlers';

// ============================================================================
// Combined Handlers
// ============================================================================

/**
 * All API handlers (without error handlers).
 * Use this for normal API testing.
 */
export const handlers = [
  ...uncertaintyHandlers,
  ...evaluationHandlers,
  ...safetyHandlers,
  ...activeLearningHandlers,
  ...oodHandlers,
];

/**
 * All handlers including error handlers.
 * Use this when you need to test error scenarios alongside normal API calls.
 */
export const allHandlers = [
  ...handlers,
  ...allErrorHandlers,
];

// ============================================================================
// Health Check Handler
// ============================================================================

const healthHandler = http.get('/api/health', async () => {
  await delay(50);
  return HttpResponse.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: Date.now(),
    services: {
      database: 'connected',
      cache: 'connected',
      model_server: 'connected',
    },
  });
});

// ============================================================================
// WebSocket Mock Handler (for completeness)
// ============================================================================

// Note: MSW has limited WebSocket support.
// For full WebSocket testing, consider using a dedicated mock.

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a handler that always returns a specific response.
 * Useful for testing specific scenarios.
 */
export function createStaticHandler<T extends DefaultBodyType>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  response: T,
  options?: { delay?: number; status?: number }
) {
  const httpMethod = http[method];
  return httpMethod(`/api${path}`, async () => {
    if (options?.delay) {
      await delay(options.delay);
    }
    return HttpResponse.json(response, { status: options?.status ?? 200 });
  });
}

/**
 * Creates a handler that returns different responses based on call count.
 * Useful for testing retry logic.
 */
export function createSequenceHandler<T extends DefaultBodyType>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  responses: Array<{ data?: T; status?: number; error?: boolean }>
) {
  let callCount = 0;
  const httpMethod = http[method];

  return httpMethod(`/api${path}`, async () => {
    const response = responses[Math.min(callCount, responses.length - 1)];
    callCount++;

    if (response.error) {
      throw new Error('Network error');
    }

    return HttpResponse.json(response.data, { status: response.status ?? 200 });
  });
}

/**
 * Creates a handler that delays response based on a callback.
 * Useful for testing loading states with variable timing.
 */
export function createDelayedHandler<T extends DefaultBodyType>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  response: T | (() => T),
  getDelay: () => number
) {
  const httpMethod = http[method];

  return httpMethod(`/api${path}`, async () => {
    await delay(getDelay());
    const data = typeof response === 'function' ? (response as () => T)() : response;
    return HttpResponse.json(data);
  });
}

// ============================================================================
// Default Export
// ============================================================================

export default handlers;
