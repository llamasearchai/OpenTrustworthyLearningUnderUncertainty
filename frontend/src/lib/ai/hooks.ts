/**
 * AI React Hooks
 *
 * React hooks for AI-powered features including streaming completions,
 * analysis helpers, and insight generation.
 *
 * @module lib/ai/hooks
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  aiClient,
  type Message,
  type CompletionOptions,
  type CompletionResponse,
  type StreamChunk,
  AIError,
} from './client';
import {
  UNCERTAINTY_ANALYSIS_PROMPT,
  SAFETY_ASSESSMENT_PROMPT,
  DATA_INSIGHT_PROMPT,
  type PromptTemplate,
} from './config';

// ============================================================================
// Types
// ============================================================================

export interface UseCompletionOptions {
  onSuccess?: (response: CompletionResponse) => void;
  onError?: (error: AIError) => void;
  onStream?: (chunk: StreamChunk) => void;
}

export interface UseCompletionResult {
  complete: (options: CompletionOptions) => Promise<CompletionResponse>;
  isLoading: boolean;
  error: AIError | null;
  response: CompletionResponse | null;
  reset: () => void;
}

export interface UseStreamingOptions {
  onChunk?: (content: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: AIError) => void;
}

export interface UseStreamingResult {
  stream: (messages: Message[]) => Promise<void>;
  cancel: () => void;
  isStreaming: boolean;
  content: string;
  error: AIError | null;
  reset: () => void;
}

// ============================================================================
// useCompletion Hook
// ============================================================================

export function useCompletion(options: UseCompletionOptions = {}): UseCompletionResult {
  const [response, setResponse] = useState<CompletionResponse | null>(null);
  const [error, setError] = useState<AIError | null>(null);

  const mutation = useMutation({
    mutationFn: (completionOptions: CompletionOptions) => aiClient.complete(completionOptions),
    onSuccess: (data) => {
      setResponse(data);
      setError(null);
      options.onSuccess?.(data);
    },
    onError: (err) => {
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'UNKNOWN');
      setError(aiError);
      options.onError?.(aiError);
    },
  });

  const complete = useCallback(
    (completionOptions: CompletionOptions) => mutation.mutateAsync(completionOptions),
    [mutation]
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    complete,
    isLoading: mutation.isPending,
    error,
    response,
    reset,
  };
}

// ============================================================================
// useStreaming Hook
// ============================================================================

export function useStreaming(options: UseStreamingOptions = {}): UseStreamingResult {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const contentRef = useRef('');

  const stream = useCallback(
    async (messages: Message[]) => {
      setIsStreaming(true);
      setError(null);
      setContent('');
      contentRef.current = '';

      try {
        const generator = aiClient.stream({ messages, stream: true });

        for await (const chunk of generator) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          contentRef.current += delta;
          setContent(contentRef.current);
          options.onChunk?.(delta);
        }

        options.onComplete?.(contentRef.current);
      } catch (err) {
        const aiError = err instanceof AIError ? err : new AIError((err as Error).message, 'UNKNOWN');
        setError(aiError);
        options.onError?.(aiError);
      } finally {
        setIsStreaming(false);
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    aiClient.cancel();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setError(null);
    contentRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        aiClient.cancel();
      }
    };
  }, [isStreaming]);

  return {
    stream,
    cancel,
    isStreaming,
    content,
    error,
    reset,
  };
}

// ============================================================================
// useTemplateCompletion Hook
// ============================================================================

export interface UseTemplateCompletionOptions<T extends Record<string, string | number>> {
  template: PromptTemplate;
  variables?: T;
  enabled?: boolean;
}

export function useTemplateCompletion<T extends Record<string, string | number>>(
  options: UseTemplateCompletionOptions<T>
) {
  const { template, variables, enabled = true } = options;

  return useQuery({
    queryKey: ['ai', 'template', template.id, variables],
    queryFn: () => aiClient.fromTemplate(template, variables ?? ({} as T)),
    enabled: enabled && !!variables,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

// ============================================================================
// Domain-Specific Hooks
// ============================================================================

export interface UncertaintyAnalysisInput {
  modelId: string;
  confidence: number;
  aleatoricScore: number;
  epistemicScore: number;
  conformalSetSize?: number;
}

export function useUncertaintyAnalysis(input: UncertaintyAnalysisInput | null) {
  return useTemplateCompletion({
    template: UNCERTAINTY_ANALYSIS_PROMPT,
    variables: input
      ? {
          modelId: input.modelId,
          confidence: input.confidence,
          aleatoricScore: input.aleatoricScore,
          epistemicScore: input.epistemicScore,
          conformalSetSize: input.conformalSetSize ?? 0,
        }
      : undefined,
    enabled: !!input,
  });
}

export interface SafetyAssessmentInput {
  riskLevel: string;
  safetyMargin: number;
  monitorStatus: string;
  mitigations: string[];
}

export function useSafetyAssessment(input: SafetyAssessmentInput | null) {
  return useTemplateCompletion({
    template: SAFETY_ASSESSMENT_PROMPT,
    variables: input
      ? {
          riskLevel: input.riskLevel,
          safetyMargin: input.safetyMargin,
          monitorStatus: input.monitorStatus,
          mitigations: input.mitigations.join(', '),
        }
      : undefined,
    enabled: !!input,
  });
}

export interface DataInsightInput {
  timeRange: string;
  dataPoints: number;
  metrics: Record<string, number>;
}

export function useDataInsight(input: DataInsightInput | null) {
  return useTemplateCompletion({
    template: DATA_INSIGHT_PROMPT,
    variables: input
      ? {
          timeRange: input.timeRange,
          dataPoints: input.dataPoints,
          metrics: Object.entries(input.metrics)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', '),
        }
      : undefined,
    enabled: !!input,
  });
}

// ============================================================================
// useConversation Hook
// ============================================================================

export interface UseConversationOptions {
  systemPrompt?: string;
  onMessage?: (message: Message) => void;
  onError?: (error: AIError) => void;
}

export interface UseConversationResult {
  messages: Message[];
  send: (content: string) => Promise<void>;
  isLoading: boolean;
  error: AIError | null;
  reset: () => void;
}

export function useConversation(options: UseConversationOptions = {}): UseConversationResult {
  const [messages, setMessages] = useState<Message[]>(() =>
    options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);

  const send = useCallback(
    async (content: string) => {
      const userMessage: Message = { role: 'user', content };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await aiClient.complete({
          messages: [...messages, userMessage],
        });

        const assistantMessage = response.choices[0]?.message;
        if (assistantMessage) {
          setMessages((prev) => [...prev, assistantMessage]);
          options.onMessage?.(assistantMessage);
        }
      } catch (err) {
        const aiError = err instanceof AIError ? err : new AIError((err as Error).message, 'UNKNOWN');
        setError(aiError);
        options.onError?.(aiError);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options]
  );

  const reset = useCallback(() => {
    setMessages(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []);
    setError(null);
  }, [options.systemPrompt]);

  return {
    messages: messages.filter((m) => m.role !== 'system'),
    send,
    isLoading,
    error,
    reset,
  };
}
