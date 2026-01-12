/**
 * AI Integration Module
 *
 * Exports all AI-related functionality including configuration,
 * client, React hooks, retry/fallback utilities, and metrics.
 *
 * @module lib/ai
 */

// Configuration
export {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_RATE_LIMIT,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_AI_CONFIG,
  UNCERTAINTY_ANALYSIS_PROMPT,
  SAFETY_ASSESSMENT_PROMPT,
  DATA_INSIGHT_PROMPT,
  calculateDelay,
  isRetryableError,
  getNextFallbackModel,
  interpolateTemplate,
  createAIClient,
  createHighReliabilityConfig,
  createLowLatencyConfig,
  type ModelId,
  type RetryConfig,
  type RateLimitConfig,
  type ContextConfig,
  type AIFeatureFlags,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
  type PromptTemplate,
  type AIConfig,
  type CreateAIClientOptions,
} from './config';

// Client
export {
  AIClient,
  aiClient,
  AIError,
  RateLimitError,
  ModelUnavailableError,
  ContextLengthError,
  type Message,
  type CompletionOptions,
  type CompletionResponse,
  type StreamChunk,
  type FunctionDefinition,
} from './client';

// Hooks
export {
  useCompletion,
  useStreaming,
  useTemplateCompletion,
  useUncertaintyAnalysis,
  useSafetyAssessment,
  useDataInsight,
  useConversation,
  type UseCompletionOptions,
  type UseCompletionResult,
  type UseStreamingOptions,
  type UseStreamingResult,
  type UseTemplateCompletionOptions,
  type UseConversationOptions,
  type UseConversationResult,
  type UncertaintyAnalysisInput,
  type SafetyAssessmentInput,
  type DataInsightInput,
} from './hooks';

// Retry Utilities
export {
  withRetry,
  withImmediateRetry,
  withConstantRetry,
  withTimeoutRetry,
  withRetryWrapper,
  retryOn,
  isRetryableError as isRetryableErrorFromRetry,
  isRetryableStatusCode,
  calculateRetryDelay,
  calculateFullJitterDelay,
  calculateDecorrelatedJitterDelay,
  type RetryOptions,
  type RetryResult,
  type RetryError,
} from './retry';

// Fallback Utilities
export {
  withFallback,
  withPriorityFallback,
  withHealthCheckFallback,
  withCostAwareFallback,
  withFallbackWrapper,
  createFallbackChain,
  FallbackChainBuilder,
  FallbackError,
  getFallbackChain,
  hasFallback,
  type FallbackOptions,
  type FallbackResult,
  type FallbackChainConfig,
  type ModelError,
} from './fallback';

// Feature Hooks
export {
  useCodeSuggestions,
  useAccessibilityAudit,
  useTestGeneration,
  useDocumentation,
  useAIFeatures,
  type CodeContext,
  type CodeSuggestion,
  type AccessibilityIssue,
  type AccessibilityAuditResult,
  type GeneratedTest,
  type TestGenerationResult,
  type DocumentationSection,
  type DocumentationResult,
  type FeatureHookOptions,
  type UseCodeSuggestionsResult,
  type UseAccessibilityAuditResult,
  type UseTestGenerationResult,
  type UseDocumentationResult,
  type UseAIFeaturesResult,
} from './features';

// Metrics
export {
  MetricsProvider,
  MetricsStore,
  globalMetricsStore,
  useMetrics,
  useAggregatedMetrics,
  useTrackedCall,
  withMetricsTracking,
  formatMetrics,
  type AICallMetrics,
  type AggregatedMetrics,
  type MetricsSnapshot,
  type CircuitBreakerMetrics,
  type MetricsContextValue,
  type MetricsProviderProps,
} from './metrics';
