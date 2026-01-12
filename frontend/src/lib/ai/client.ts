/**
 * AI Client
 *
 * Client for interacting with AI models with retry logic,
 * fallback handling, and streaming support.
 *
 * @module lib/ai/client
 */

import {
  type AIConfig,
  type ModelId,
  type PromptTemplate,
  type RetryConfig,
  DEFAULT_AI_CONFIG,
  calculateDelay,
  isRetryableError,
  getNextFallbackModel,
  interpolateTemplate,
} from './config';

// ============================================================================
// Types
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface CompletionOptions {
  model?: ModelId;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface CompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: Message;
    finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  choices: {
    index: number;
    delta: Partial<Message>;
    finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }[];
}

// ============================================================================
// Errors
// ============================================================================

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class RateLimitError extends AIError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMITED', 429, true);
    this.name = 'RateLimitError';
  }
}

export class ModelUnavailableError extends AIError {
  constructor(model: string) {
    super(`Model ${model} is unavailable`, 'MODEL_UNAVAILABLE', 503, true);
    this.name = 'ModelUnavailableError';
  }
}

export class ContextLengthError extends AIError {
  constructor(
    public readonly tokenCount: number,
    public readonly maxTokens: number
  ) {
    super(
      `Context length ${tokenCount} exceeds maximum ${maxTokens}`,
      'CONTEXT_LENGTH_EXCEEDED',
      400,
      false
    );
    this.name = 'ContextLengthError';
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private requestCount: number;
  private requestResetTime: number;

  constructor(
    private readonly tokensPerMinute: number,
    private readonly requestsPerMinute: number,
    private readonly burstLimit: number
  ) {
    this.tokens = burstLimit;
    this.lastRefill = Date.now();
    this.requestCount = 0;
    this.requestResetTime = Date.now() + 60000;
  }

  async acquire(tokenCount: number = 1): Promise<void> {
    this.refill();

    if (Date.now() >= this.requestResetTime) {
      this.requestCount = 0;
      this.requestResetTime = Date.now() + 60000;
    }

    if (this.requestCount >= this.requestsPerMinute) {
      const waitTime = this.requestResetTime - Date.now();
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestResetTime = Date.now() + 60000;
    }

    if (this.tokens < tokenCount) {
      const refillRate = this.tokensPerMinute / 60000;
      const waitTime = (tokenCount - this.tokens) / refillRate;
      await this.sleep(waitTime);
      this.refill();
    }

    this.tokens -= tokenCount;
    this.requestCount++;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = (elapsed / 60000) * this.tokensPerMinute;
    this.tokens = Math.min(this.burstLimit, this.tokens + refillAmount);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }
}

// ============================================================================
// AI Client
// ============================================================================

export class AIClient {
  private readonly config: AIConfig;
  private readonly rateLimiter: RateLimiter;
  private abortController: AbortController | null = null;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.tokensPerMinute,
      this.config.rateLimit.requestsPerMinute,
      this.config.rateLimit.burstLimit
    );
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const model = options.model ?? this.config.defaultModel;
    let currentModel: ModelId | null = model;
    let lastError: AIError | null = null;

    while (currentModel) {
      try {
        return await this.executeWithRetry(
          () => this.sendRequest(currentModel!, options),
          this.config.retry
        );
      } catch (error) {
        if (error instanceof AIError) {
          lastError = error;
          if (this.config.features.enableFallback && error.retryable) {
            const nextModel = getNextFallbackModel(currentModel);
            if (nextModel) {
              console.warn(`Falling back from ${currentModel} to ${nextModel}`);
              currentModel = nextModel;
              continue;
            }
          }
        }
        throw error;
      }
    }

    throw lastError ?? new AIError('All models exhausted', 'ALL_MODELS_EXHAUSTED');
  }

  async *stream(options: CompletionOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model ?? this.config.defaultModel;
    await this.rateLimiter.acquire();

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_AI_API_KEY ?? ''}`,
          'X-API-Version': this.config.apiVersion,
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? this.config.rateLimit.tokensPerRequest,
          stream: true,
          ...this.buildOptionalParams(options),
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIError('No response body', 'NO_RESPONSE_BODY');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const chunk = JSON.parse(data) as StreamChunk;
              yield chunk;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  async fromTemplate(
    template: PromptTemplate,
    variables: Record<string, string | number>,
    options?: Partial<CompletionOptions>
  ): Promise<CompletionResponse> {
    const userContent = interpolateTemplate(template.userPromptTemplate, variables);

    return this.complete({
      messages: [
        { role: 'system', content: template.systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: template.temperature,
      maxTokens: template.maxResponseTokens,
      ...options,
    });
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryConfig: RetryConfig
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        if (error instanceof RateLimitError && error.retryAfter) {
          await this.sleep(error.retryAfter * 1000);
          continue;
        }

        if (attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(attempt, retryConfig);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private async sendRequest(
    model: ModelId,
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    await this.rateLimiter.acquire();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_AI_API_KEY ?? ''}`,
          'X-API-Version': this.config.apiVersion,
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? this.config.rateLimit.tokensPerRequest,
          ...this.buildOptionalParams(options),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildOptionalParams(options: CompletionOptions): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (options.topP !== undefined) params.top_p = options.topP;
    if (options.frequencyPenalty !== undefined) params.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined) params.presence_penalty = options.presencePenalty;
    if (options.stop) params.stop = options.stop;
    if (options.functions && this.config.features.enableFunctionCalling) {
      params.functions = options.functions;
      if (options.functionCall) params.function_call = options.functionCall;
    }

    return params;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const contentType = response.headers.get('content-type');
    let errorData: { error?: { message?: string; code?: string } } = {};

    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    }

    const message = errorData.error?.message ?? `HTTP ${response.status}`;
    const code = errorData.error?.code ?? 'UNKNOWN_ERROR';

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '60');
      throw new RateLimitError(message, retryAfter);
    }

    if (response.status === 503) {
      throw new ModelUnavailableError(code);
    }

    if (response.status === 400 && code === 'context_length_exceeded') {
      throw new ContextLengthError(0, this.config.context.maxTokens);
    }

    const retryable = isRetryableError(response.status, this.config.retry);
    throw new AIError(message, code, response.status, retryable);
  }

  private transformResponse(data: Record<string, unknown>): CompletionResponse {
    return {
      id: data.id as string,
      model: data.model as string,
      choices: (data.choices as Array<Record<string, unknown>>).map((choice) => ({
        index: choice.index as number,
        message: {
          role: (choice.message as Record<string, unknown>).role as Message['role'],
          content: (choice.message as Record<string, unknown>).content as string,
        },
        finishReason: (choice.finish_reason as string).replace('_', '') as CompletionResponse['choices'][0]['finishReason'],
      })),
      usage: {
        promptTokens: (data.usage as Record<string, number>).prompt_tokens,
        completionTokens: (data.usage as Record<string, number>).completion_tokens,
        totalTokens: (data.usage as Record<string, number>).total_tokens,
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Default Client Instance
// ============================================================================

export const aiClient = new AIClient();
