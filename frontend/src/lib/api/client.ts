/**
 * API Client for OpenTLU Backend
 *
 * Typed fetch wrappers with authentication, retry logic with exponential backoff,
 * error handling, and WebSocket support for real-time updates.
 *
 * @module lib/api/client
 */

import { z } from 'zod';
import type {
  ApiError,
  PaginatedResponse,
  WebSocketMessage,
  WebSocketMessageType,
  UncertaintyEstimate,
  RiskAssessment,
  SafetyEnvelope,
  MonitorOutput,
  MitigationState,
  ConformalConfig,
  ConformalResult,
  OODResult,
  Scenario,
  EvaluationResult,
  AggregatedResults,
  SampleMetadata,
  AcquisitionConfig,
  BatchSelectionResult,
  FilteredAction,
  TimeSeriesPoint,
  UncertaintyDecomposition,
  CalibrationMetrics,
  SafetyMarginTimeline,
} from '@/types/api';
import {
  uncertaintyEstimateSchema,
  monitorOutputSchema,
  conformalResultSchema,
  oodResultSchema,
  scenarioSchema,
  evaluationResultSchema,
  aggregatedResultsSchema,
  sampleMetadataSchema,
  batchSelectionResultSchema,
  filteredActionSchema,
  paginatedResponseSchema,
  apiErrorSchema,
  safetyMarginTimelineSchema,
  calibrationMetricsSchema,
} from '@/lib/validations/api-schemas';

// ============================================================================
// Configuration
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  jitter: 0.1,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// ============================================================================
// Error Handling
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public requestId?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromApiError(error: ApiError, statusCode?: number): ApiClientError {
    return new ApiClientError(
      error.code,
      error.message,
      error.details,
      error.request_id,
      statusCode
    );
  }

  get isRetryable(): boolean {
    if (this.statusCode === 429) return true; // Rate limited
    if (this.statusCode && this.statusCode >= 500) return true; // Server error
    return false;
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string) {
    super('NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }

  get isRetryable(): boolean {
    return true;
  }
}

export class TimeoutError extends ApiClientError {
  constructor(timeoutMs: number) {
    super('TIMEOUT', `Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }

  get isRetryable(): boolean {
    return true;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = Math.min(
    config.initialDelayMs * Math.pow(config.multiplier, attempt),
    config.maxDelayMs
  );
  const jitter = baseDelay * config.jitter * (Math.random() * 2 - 1);
  return Math.max(0, baseDelay + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ============================================================================
// Core Fetch with Retry
// ============================================================================

interface FetchOptions extends RequestInit {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  skipAuth?: boolean;
}

async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
  schema?: z.ZodType<T>
): Promise<T> {
  const {
    timeout = 30000,
    retryConfig: customRetryConfig,
    skipAuth = false,
    ...fetchOptions
  } = options;

  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...customRetryConfig };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(!skipAuth ? getAuthHeaders() : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const parsedError = apiErrorSchema.safeParse(errorBody);

        const error = parsedError.success
          ? ApiClientError.fromApiError(parsedError.data, response.status)
          : new ApiClientError(
              'API_ERROR',
              errorBody.message || `HTTP ${response.status}`,
              errorBody,
              undefined,
              response.status
            );

        if (error.isRetryable && attempt < retryConfig.maxRetries) {
          lastError = error;
          await sleep(calculateDelay(attempt, retryConfig));
          continue;
        }

        throw error;
      }

      const data = await response.json();

      if (schema) {
        const result = schema.safeParse(data);
        if (!result.success) {
          throw new ApiClientError(
            'VALIDATION_ERROR',
            'Response validation failed',
            { errors: result.error.errors }
          );
        }
        return result.data;
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(timeout);
        }

        const networkError = new NetworkError(error.message);
        if (networkError.isRetryable && attempt < retryConfig.maxRetries) {
          lastError = networkError;
          await sleep(calculateDelay(attempt, retryConfig));
          continue;
        }

        throw networkError;
      }

      throw error;
    }
  }

  throw lastError || new Error('Unknown error');
}

// ============================================================================
// API Client Methods
// ============================================================================

export const api = {
  // Uncertainty endpoints
  uncertainty: {
    getEstimate: (modelId: string): Promise<UncertaintyEstimate> =>
      fetchWithRetry(
        `${API_BASE_URL}/uncertainty/estimate?model_id=${modelId}`,
        { method: 'GET' },
        uncertaintyEstimateSchema
      ),

    getHistory: (
      modelId: string,
      params?: { start?: number; end?: number; limit?: number }
    ): Promise<PaginatedResponse<TimeSeriesPoint>> => {
      const searchParams = new URLSearchParams({ model_id: modelId });
      if (params?.start) searchParams.set('start', params.start.toString());
      if (params?.end) searchParams.set('end', params.end.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      return fetchWithRetry(`${API_BASE_URL}/uncertainty/history?${searchParams}`);
    },

    decompose: (ensembleProbs: number[][]): Promise<UncertaintyDecomposition> =>
      fetchWithRetry(`${API_BASE_URL}/uncertainty/decompose`, {
        method: 'POST',
        body: JSON.stringify({ ensemble_probs: ensembleProbs }),
      }),
  },

  // Conformal prediction endpoints
  conformal: {
    configure: (config: ConformalConfig): Promise<{ success: boolean }> =>
      fetchWithRetry(`${API_BASE_URL}/conformal/configure`, {
        method: 'POST',
        body: JSON.stringify(config),
      }),

    predict: (
      scores: number[],
      calibrationId?: string
    ): Promise<ConformalResult> =>
      fetchWithRetry(
        `${API_BASE_URL}/conformal/predict`,
        {
          method: 'POST',
          body: JSON.stringify({ scores, calibration_id: calibrationId }),
        },
        conformalResultSchema
      ),

    calibrate: (
      scores: number[],
      labels: number[],
      coverage?: number
    ): Promise<{ calibration_id: string; quantile: number }> =>
      fetchWithRetry(`${API_BASE_URL}/conformal/calibrate`, {
        method: 'POST',
        body: JSON.stringify({ scores, labels, coverage }),
      }),
  },

  // OOD detection endpoints
  ood: {
    detect: (features: number[]): Promise<OODResult> =>
      fetchWithRetry(
        `${API_BASE_URL}/ood/detect`,
        {
          method: 'POST',
          body: JSON.stringify({ features }),
        },
        oodResultSchema
      ),

    batchDetect: (
      featureBatch: number[][]
    ): Promise<{ results: OODResult[] }> =>
      fetchWithRetry(`${API_BASE_URL}/ood/batch-detect`, {
        method: 'POST',
        body: JSON.stringify({ features: featureBatch }),
      }),

    getThreshold: (detectorType: string): Promise<{ threshold: number }> =>
      fetchWithRetry(`${API_BASE_URL}/ood/threshold?detector=${detectorType}`),
  },

  // Evaluation endpoints
  scenarios: {
    list: (params?: {
      page?: number;
      pageSize?: number;
      tags?: Record<string, string>;
    }): Promise<PaginatedResponse<Scenario>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
      if (params?.tags) searchParams.set('tags', JSON.stringify(params.tags));

      return fetchWithRetry(
        `${API_BASE_URL}/scenarios?${searchParams}`,
        { method: 'GET' },
        paginatedResponseSchema(scenarioSchema)
      );
    },

    get: (id: string): Promise<Scenario> =>
      fetchWithRetry(
        `${API_BASE_URL}/scenarios/${id}`,
        { method: 'GET' },
        scenarioSchema
      ),

    create: (scenario: Omit<Scenario, 'id'>): Promise<Scenario> =>
      fetchWithRetry(
        `${API_BASE_URL}/scenarios`,
        {
          method: 'POST',
          body: JSON.stringify(scenario),
        },
        scenarioSchema
      ),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetchWithRetry(`${API_BASE_URL}/scenarios/${id}`, { method: 'DELETE' }),
  },

  evaluation: {
    run: (
      scenarioId: string,
      metrics: string[]
    ): Promise<EvaluationResult> =>
      fetchWithRetry(
        `${API_BASE_URL}/evaluate`,
        {
          method: 'POST',
          body: JSON.stringify({ scenario_id: scenarioId, metrics }),
        },
        evaluationResultSchema
      ),

    getResults: (
      scenarioId: string
    ): Promise<PaginatedResponse<EvaluationResult>> =>
      fetchWithRetry(
        `${API_BASE_URL}/evaluation/results?scenario_id=${scenarioId}`,
        { method: 'GET' },
        paginatedResponseSchema(evaluationResultSchema)
      ),

    aggregate: (scenarioIds?: string[]): Promise<AggregatedResults> =>
      fetchWithRetry(
        `${API_BASE_URL}/evaluation/aggregate`,
        {
          method: 'POST',
          body: JSON.stringify({ scenario_ids: scenarioIds }),
        },
        aggregatedResultsSchema
      ),
  },

  // Safety endpoints
  safety: {
    getMonitors: (): Promise<MonitorOutput[]> =>
      fetchWithRetry(
        `${API_BASE_URL}/monitors`,
        { method: 'GET' },
        z.array(monitorOutputSchema)
      ),

    getMonitor: (id: string): Promise<MonitorOutput> =>
      fetchWithRetry(
        `${API_BASE_URL}/monitors/${id}`,
        { method: 'GET' },
        monitorOutputSchema
      ),

    getMitigationState: (): Promise<{ state: MitigationState }> =>
      fetchWithRetry(`${API_BASE_URL}/mitigation/state`),

    filterAction: (
      action: number[],
      envelope?: SafetyEnvelope
    ): Promise<FilteredAction> =>
      fetchWithRetry(
        `${API_BASE_URL}/safety/filter`,
        {
          method: 'POST',
          body: JSON.stringify({ action, safety_envelope: envelope }),
        },
        filteredActionSchema
      ),

    getTimeline: (params?: {
      start?: number;
      end?: number;
      limit?: number;
    }): Promise<SafetyMarginTimeline[]> => {
      const searchParams = new URLSearchParams();
      if (params?.start) searchParams.set('start', params.start.toString());
      if (params?.end) searchParams.set('end', params.end.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      return fetchWithRetry(
        `${API_BASE_URL}/safety/timeline?${searchParams}`,
        { method: 'GET' },
        z.array(safetyMarginTimelineSchema)
      );
    },
  },

  // Active learning endpoints
  activeLearning: {
    getSamples: (params?: {
      page?: number;
      pageSize?: number;
      sortBy?: 'uncertainty' | 'risk' | 'novelty';
      sortOrder?: 'asc' | 'desc';
    }): Promise<PaginatedResponse<SampleMetadata>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString());
      if (params?.sortBy) searchParams.set('sort_by', params.sortBy);
      if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder);

      return fetchWithRetry(
        `${API_BASE_URL}/samples?${searchParams}`,
        { method: 'GET' },
        paginatedResponseSchema(sampleMetadataSchema)
      );
    },

    selectBatch: (
      sampleIds: string[],
      batchSize: number,
      config?: AcquisitionConfig
    ): Promise<BatchSelectionResult> =>
      fetchWithRetry(
        `${API_BASE_URL}/acquisition/select`,
        {
          method: 'POST',
          body: JSON.stringify({
            sample_ids: sampleIds,
            batch_size: batchSize,
            config,
          }),
        },
        batchSelectionResultSchema
      ),

    getAcquisitionConfig: (): Promise<AcquisitionConfig> =>
      fetchWithRetry(`${API_BASE_URL}/acquisition/config`),

    updateAcquisitionConfig: (
      config: Partial<AcquisitionConfig>
    ): Promise<AcquisitionConfig> =>
      fetchWithRetry(`${API_BASE_URL}/acquisition/config`, {
        method: 'PATCH',
        body: JSON.stringify(config),
      }),
  },

  // Calibration endpoints
  calibration: {
    getMetrics: (modelId: string): Promise<CalibrationMetrics> =>
      fetchWithRetry(
        `${API_BASE_URL}/calibration/metrics?model_id=${modelId}`,
        { method: 'GET' },
        calibrationMetricsSchema
      ),
  },
};

// ============================================================================
// WebSocket Client
// ============================================================================

export type WebSocketMessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;

export interface WebSocketClientOptions {
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  heartbeatIntervalMs?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WebSocketMessageType, Set<WebSocketMessageHandler>> = new Map();
  private reconnectAttempts: number;
  private reconnectDelayMs: number;
  private heartbeatIntervalMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private currentAttempt = 0;
  private isClosing = false;

  constructor(options: WebSocketClientOptions = {}) {
    this.reconnectAttempts = options.reconnectAttempts ?? 5;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30000;
  }

  connect(url: string = WS_BASE_URL): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isClosing = false;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.currentAttempt = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        const typeHandlers = this.handlers.get(message.type);
        if (typeHandlers) {
          typeHandlers.forEach((handler) => handler(message));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.isClosing && this.currentAttempt < this.reconnectAttempts) {
        this.currentAttempt++;
        setTimeout(() => this.connect(url), this.reconnectDelayMs * this.currentAttempt);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    this.isClosing = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe<T>(
    type: WebSocketMessageType,
    handler: WebSocketMessageHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as WebSocketMessageHandler);

    return () => {
      const typeHandlers = this.handlers.get(type);
      if (typeHandlers) {
        typeHandlers.delete(handler as WebSocketMessageHandler);
      }
    };
  }

  send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton WebSocket client instance
export const wsClient = new WebSocketClient();

// ============================================================================
// Export Types
// ============================================================================

export type { ApiError, PaginatedResponse, WebSocketMessage };
