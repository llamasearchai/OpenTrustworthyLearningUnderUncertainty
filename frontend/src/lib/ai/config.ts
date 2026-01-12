/**
 * AI Integration Configuration
 *
 * Configuration for AI-assisted features including model selection,
 * retry logic, and fallback strategies.
 *
 * @module lib/ai/config
 */

// ============================================================================
// Model Configuration
// ============================================================================

export const DEFAULT_MODEL = 'gpt-5.2' as const;

export const FALLBACK_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o-mini',
] as const;

export type ModelId = typeof DEFAULT_MODEL | (typeof FALLBACK_MODELS)[number];

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  tokensPerRequest: number;
  burstLimit: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
  tokensPerRequest: 4096,
  burstLimit: 10,
};

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxRequests: number;
  monitoringWindowMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxRequests: 3,
  monitoringWindowMs: 30000,
};

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// ============================================================================
// Context Configuration
// ============================================================================

export interface ContextConfig {
  maxTokens: number;
  reservedTokens: number;
  truncationStrategy: 'head' | 'tail' | 'middle';
  preserveSystemPrompt: boolean;
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 128000,
  reservedTokens: 4096,
  truncationStrategy: 'tail',
  preserveSystemPrompt: true,
};

// ============================================================================
// Feature Flags
// ============================================================================

export interface AIFeatureFlags {
  enableStreaming: boolean;
  enableFunctionCalling: boolean;
  enableVision: boolean;
  enableCodeInterpreter: boolean;
  enableRetrieval: boolean;
  enableFallback: boolean;
}

export const DEFAULT_FEATURE_FLAGS: AIFeatureFlags = {
  enableStreaming: true,
  enableFunctionCalling: true,
  enableVision: true,
  enableCodeInterpreter: false,
  enableRetrieval: false,
  enableFallback: true,
};

// ============================================================================
// Prompt Templates
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  maxResponseTokens: number;
  temperature: number;
}

export const UNCERTAINTY_ANALYSIS_PROMPT: PromptTemplate = {
  id: 'uncertainty-analysis',
  name: 'Uncertainty Analysis',
  systemPrompt: `You are an expert in uncertainty quantification and trustworthy machine learning.
Analyze the provided uncertainty metrics and provide actionable insights.
Focus on:
1. Identifying sources of uncertainty (aleatoric vs epistemic)
2. Assessing model calibration quality
3. Recommending mitigation strategies
4. Highlighting potential safety concerns`,
  userPromptTemplate: `Analyze the following uncertainty data:

Model ID: {{modelId}}
Confidence: {{confidence}}
Aleatoric Score: {{aleatoricScore}}
Epistemic Score: {{epistemicScore}}
Conformal Set Size: {{conformalSetSize}}

Provide a concise analysis with recommendations.`,
  variables: ['modelId', 'confidence', 'aleatoricScore', 'epistemicScore', 'conformalSetSize'],
  maxResponseTokens: 1024,
  temperature: 0.3,
};

export const SAFETY_ASSESSMENT_PROMPT: PromptTemplate = {
  id: 'safety-assessment',
  name: 'Safety Assessment',
  systemPrompt: `You are a safety engineer specializing in autonomous systems.
Evaluate the provided safety metrics and risk assessments.
Consider:
1. Current risk levels and their implications
2. Safety margin adequacy
3. Potential failure modes
4. Recommended mitigations`,
  userPromptTemplate: `Evaluate the safety status:

Risk Level: {{riskLevel}}
Safety Margin: {{safetyMargin}}
Monitor Status: {{monitorStatus}}
Active Mitigations: {{mitigations}}

Provide a safety assessment with actionable recommendations.`,
  variables: ['riskLevel', 'safetyMargin', 'monitorStatus', 'mitigations'],
  maxResponseTokens: 1024,
  temperature: 0.2,
};

export const DATA_INSIGHT_PROMPT: PromptTemplate = {
  id: 'data-insight',
  name: 'Data Insight',
  systemPrompt: `You are a data scientist specializing in machine learning operations.
Analyze patterns in the provided data and generate insights.
Focus on:
1. Trend identification
2. Anomaly detection
3. Correlation analysis
4. Predictive observations`,
  userPromptTemplate: `Analyze the following data trends:

Time Range: {{timeRange}}
Data Points: {{dataPoints}}
Key Metrics: {{metrics}}

Identify patterns and provide actionable insights.`,
  variables: ['timeRange', 'dataPoints', 'metrics'],
  maxResponseTokens: 2048,
  temperature: 0.4,
};

// ============================================================================
// Complete AI Configuration
// ============================================================================

export interface AIConfig {
  defaultModel: ModelId;
  fallbackModels: readonly ModelId[];
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  context: ContextConfig;
  features: AIFeatureFlags;
  circuitBreaker: CircuitBreakerConfig;
  apiEndpoint: string;
  apiVersion: string;
  timeout: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  defaultModel: DEFAULT_MODEL,
  fallbackModels: FALLBACK_MODELS,
  retry: DEFAULT_RETRY_CONFIG,
  rateLimit: DEFAULT_RATE_LIMIT,
  context: DEFAULT_CONTEXT_CONFIG,
  features: DEFAULT_FEATURE_FLAGS,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  apiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT ?? 'https://api.openai.com/v1',
  apiVersion: '2024-01',
  timeout: 60000,
};

// ============================================================================
// Utility Functions
// ============================================================================

export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

export function isRetryableError(statusCode: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return config.retryableStatusCodes.includes(statusCode);
}

export function getNextFallbackModel(currentModel: ModelId): ModelId | null {
  if (currentModel === DEFAULT_MODEL) {
    return FALLBACK_MODELS[0] ?? null;
  }
  const currentIndex = FALLBACK_MODELS.indexOf(currentModel as (typeof FALLBACK_MODELS)[number]);
  if (currentIndex === -1 || currentIndex >= FALLBACK_MODELS.length - 1) {
    return null;
  }
  return FALLBACK_MODELS[currentIndex + 1] ?? null;
}

export function interpolateTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(variables[key] ?? `{{${key}}}`);
  });
}

// ============================================================================
// AI Client Factory
// ============================================================================

export interface CreateAIClientOptions {
  config?: Partial<AIConfig>;
  apiKey?: string;
  organizationId?: string;
}

/**
 * Creates an AI client configuration with optional overrides.
 * This factory function allows creating multiple client configurations
 * with different settings for different use cases.
 *
 * @param options - Configuration options for the AI client
 * @returns Complete AI configuration
 */
export function createAIClient(options: CreateAIClientOptions = {}): AIConfig {
  const { config = {}, apiKey, organizationId } = options;

  const mergedConfig: AIConfig = {
    ...DEFAULT_AI_CONFIG,
    ...config,
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retry,
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMIT,
      ...config.rateLimit,
    },
    context: {
      ...DEFAULT_CONTEXT_CONFIG,
      ...config.context,
    },
    features: {
      ...DEFAULT_FEATURE_FLAGS,
      ...config.features,
    },
    circuitBreaker: {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config.circuitBreaker,
    },
  };

  // Store API key and organization ID in closure for later use
  if (apiKey || organizationId) {
    Object.defineProperty(mergedConfig, '_credentials', {
      value: { apiKey, organizationId },
      enumerable: false,
      writable: false,
    });
  }

  return mergedConfig;
}

/**
 * Creates a configuration preset for high-reliability scenarios
 * with more aggressive retry and fallback settings.
 */
export function createHighReliabilityConfig(): AIConfig {
  return createAIClient({
    config: {
      retry: {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 5,
        initialDelayMs: 500,
        backoffMultiplier: 1.5,
      },
      circuitBreaker: {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        failureThreshold: 10,
        resetTimeoutMs: 30000,
      },
      features: {
        ...DEFAULT_FEATURE_FLAGS,
        enableFallback: true,
      },
    },
  });
}

/**
 * Creates a configuration preset for low-latency scenarios
 * with reduced timeouts and minimal retries.
 */
export function createLowLatencyConfig(): AIConfig {
  return createAIClient({
    config: {
      timeout: 15000,
      retry: {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        initialDelayMs: 250,
        maxDelayMs: 1000,
      },
      features: {
        ...DEFAULT_FEATURE_FLAGS,
        enableFallback: false,
        enableStreaming: true,
      },
    },
  });
}
