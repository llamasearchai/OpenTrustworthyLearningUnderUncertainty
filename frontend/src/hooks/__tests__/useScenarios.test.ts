/**
 * useScenarios Hook Tests
 *
 * Comprehensive test suite for the useScenarios hooks.
 *
 * @module hooks/__tests__/useScenarios.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useScenarios,
  useScenario,
  useCreateScenario,
  useDeleteScenario,
  useRunEvaluation,
} from '../useScenarios';
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

describe('useScenarios hooks', () => {
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

    it('should handle search parameter', async () => {
      const mockData = {
        items: [createScenario({ id: 'scenario-1' })],
        total: 1,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.scenarios.list).mockResolvedValue(mockData);

      const { result } = renderHook(() => useScenarios({ search: 'test' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.scenarios.list).toHaveBeenCalledWith({ search: 'test' });
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
  });

  describe('useCreateScenario', () => {
    it('should create scenario', async () => {
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

      expect(api.scenarios.create).toHaveBeenCalled();
    });
  });

  describe('useDeleteScenario', () => {
    it('should delete scenario', async () => {
      vi.mocked(api.scenarios.delete).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteScenario(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('scenario-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.scenarios.delete).toHaveBeenCalledWith('scenario-1');
    });
  });

  describe('useRunEvaluation', () => {
    it('should run evaluation', async () => {
      const mockData = createEvaluationResult();
      vi.mocked(api.evaluation.run).mockResolvedValue(mockData);

      const { result } = renderHook(() => useRunEvaluation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        scenarioId: 'scenario-1',
        metrics: ['accuracy'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.evaluation.run).toHaveBeenCalledWith('scenario-1', ['accuracy']);
    });
  });
});
