/**
 * useActiveLearning Hook Tests
 *
 * Comprehensive test suite for the useActiveLearning hooks.
 *
 * @module hooks/__tests__/useActiveLearning.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSamples,
  useSamplesInfinite,
  useAcquisitionConfig,
  useUpdateAcquisitionConfig,
  useRankedSamples,
} from '../useActiveLearning';
import { createSampleMetadata } from '@/tests/mocks/factories';
import { api } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => {
  const mockApi = {
    activeLearning: {
      getSamples: vi.fn(),
      getAcquisitionConfig: vi.fn(),
      updateAcquisitionConfig: vi.fn(),
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

describe('useActiveLearning hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSamples', () => {
    it('should fetch samples', async () => {
      const mockData = {
        items: [createSampleMetadata({ id: 'sample-1' })],
        total: 1,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.activeLearning.getSamples).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSamples(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should handle loading state', () => {
      vi.mocked(api.activeLearning.getSamples).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useSamples(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch');
      vi.mocked(api.activeLearning.getSamples).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSamples(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useSamplesInfinite', () => {
    it('should fetch samples with infinite query', async () => {
      const mockData = {
        items: [createSampleMetadata({ id: 'sample-1' })],
        total: 1,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.activeLearning.getSamples).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSamplesInfinite(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useAcquisitionConfig', () => {
    it('should fetch acquisition config', async () => {
      const mockData = {
        strategy: 'uncertainty',
        batch_size: 10,
        budget: 1000,
        weight_uncertainty: 0.5,
        weight_risk: 0.3,
        weight_novelty: 0.2,
        diversity_penalty: 0.1,
      };

      vi.mocked(api.activeLearning.getAcquisitionConfig).mockResolvedValue(mockData);

      const { result } = renderHook(() => useAcquisitionConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useUpdateAcquisitionConfig', () => {
    it('should update acquisition config', async () => {
      const mockData = {
        weight_uncertainty: 0.5,
        weight_risk: 0.3,
        weight_novelty: 0.2,
        diversity_penalty: 0.1,
      };

      vi.mocked(api.activeLearning.updateAcquisitionConfig).mockResolvedValue(mockData);

      const { result } = renderHook(() => useUpdateAcquisitionConfig(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        weight_uncertainty: 0.6,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.activeLearning.updateAcquisitionConfig).toHaveBeenCalled();
    });
  });

  describe('useRankedSamples', () => {
    it('should return ranked samples', async () => {
      const mockData = {
        items: [
          createSampleMetadata({ id: 'sample-1' }),
          createSampleMetadata({ id: 'sample-2' }),
        ],
        total: 2,
        page: 1,
        page_size: 10,
        has_more: false,
      };

      vi.mocked(api.activeLearning.getSamples).mockResolvedValue(mockData);

      const { result } = renderHook(() => useRankedSamples(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });
});
