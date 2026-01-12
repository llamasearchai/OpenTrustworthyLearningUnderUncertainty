/**
 * Test Infrastructure Index
 *
 * Central export for the OpenTLU test infrastructure.
 *
 * @module tests
 */

// ============================================================================
// Test Utilities
// ============================================================================

export * from './utils';

// ============================================================================
// Mocks
// ============================================================================

// Factories
export {
  createUncertaintyEstimate,
  createRiskAssessment,
  createMonitorOutput,
  createMitigationState,
  createScenario,
  createEvaluationResult,
  createSampleMetadata,
  createAcquisitionConfig,
  createBatchSelectionResult,
  createOODResult,
  createConformalResult,
  createFilteredAction,
  createSafetyMarginTimeline,
  createMany,
} from './mocks/factories';

// Handlers
export {
  handlers,
  allHandlers,
  uncertaintyHandlers,
  evaluationHandlers,
  safetyHandlers,
  activeLearningHandlers,
  oodHandlers,
  errorHandlers,
  allErrorHandlers,

  // Handler factory functions
  createStaticHandler,
  createSequenceHandler,
  createDelayedHandler,

  // Error handler factories
  create401Handler,
  create403Handler,
  create404Handler,
  create422Handler,
  create429Handler,
  create500Handler,
  createNetworkErrorHandler,
  createTimeoutHandler,
} from './mocks/handlers';

// Server (for Node.js/Vitest)
export {
  server,
  resetHandlers,
  useAllHandlers,
  useHandlers,
  closeServer,
  startServer,
  createServerTestContext,
} from './mocks/server';

// Browser (for Storybook) - conditionally exported
// Use: import { worker } from '@/tests/mocks/browser'
