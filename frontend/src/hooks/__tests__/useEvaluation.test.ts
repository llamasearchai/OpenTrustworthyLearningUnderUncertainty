/**
 * useEvaluation Hook Tests
 *
 * Comprehensive test suite for the useEvaluation hooks.
 *
 * @module hooks/__tests__/useEvaluation.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useScenarios,
  useScenario,
  useEvaluationResults,
  useRunEvaluation,
  useCreateScenario,
  useDeleteScenario,
} from '../useEvaluation';
import { createScenario, createEvaluationResult } from '@/tests/mocks/factories';
import { api } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => {
  const mockApi = {
    scenarios: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    evaluation: {
      getResults: vi.fn(),
      run: vi.fn(),
    },
  };
  return {
    api: mockApi,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useEvaluation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useScenarios', () => {
    it('should fetch scenarios list', async () => {
      const mockData = {
        items: [createScenario({ id: 'scenario-1' })],
        total: 1,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.scenarios.list).mockResolvedValue(mockData);

      const { result } = renderHook(() => useScenarios(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should handle loading state', () => {
      vi.mocked(api.scenarios.list).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useScenarios(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch');
      vi.mocked(api.scenarios.list).mockRejectedValue(mockError);

      const { result } = renderHook(() => useScenarios(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useScenario', () => {
    it('should fetch single scenario', async () => {
      const mockData = createScenario({ id: 'scenario-1' });
      vi.mocked(api.scenarios.get).mockResolvedValue(mockData);

      const { result } = renderHook(() => useScenario('scenario-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useScenario('', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(api.scenarios.get).not.toHaveBeenCalled();
    });
  });

  describe('useEvaluationResults', () => {
    it('should fetch evaluation results', async () => {
      const mockData = {
        items: [createEvaluationResult()],
        total: 1,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.evaluation.getResults).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEvaluationResults('scenario-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useRunEvaluation', () => {
    it('should run evaluation mutation', async () => {
      const mockData = createEvaluationResult();
      vi.mocked(api.evaluation.run).mockResolvedValue(mockData);

      const { result } = renderHook(() => useRunEvaluation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        scenarioId: 'scenario-1',
        metrics: ['accuracy', 'safety'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.evaluation.run).toHaveBeenCalledWith('scenario-1', ['accuracy', 'safety']);
    });
  });

  describe('useCreateScenario', () => {
    it('should create scenario mutation', async () => {
      const mockData = createScenario({ id: 'scenario-new' });
      vi.mocked(api.scenarios.create).mockResolvedValue(mockData);

      const { result } = renderHook(() => useCreateScenario(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        tags: { environment: 'urban' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useDeleteScenario', () => {
    it('should delete scenario mutation', async () => {
      vi.mocked(api.scenarios.delete).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteScenario(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('scenario-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
