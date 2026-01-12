/**
 * useUncertainty Hook Tests
 *
 * Comprehensive test suite for the useUncertainty hook.
 *
 * @module hooks/__tests__/useUncertainty.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUncertaintyEstimate } from '../useUncertainty';

const mockGetEstimate = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    uncertainty: {
      getEstimate: (...args: any[]) => mockGetEstimate(...args),
    },
  },
}));

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

describe('useUncertaintyEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Fetching', () => {
    it('should fetch uncertainty estimates', async () => {
      const mockData = {
        confidence: 0.85,
        aleatoric_score: 0.1,
        epistemic_score: 0.15,
        source: 'ensemble_variance',
      };

      mockGetEstimate.mockResolvedValue(mockData);

      const { result } = renderHook(() => useUncertaintyEstimate('model-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should handle loading state', () => {
      mockGetEstimate.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useUncertaintyEstimate('model-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch');
      mockGetEstimate.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUncertaintyEstimate('model-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Refetching', () => {
    it('should refetch data on demand', async () => {
      const mockData = {
        confidence: 0.85,
        aleatoric_score: 0.1,
        epistemic_score: 0.15,
        source: 'ensemble_variance',
      };

      mockGetEstimate.mockResolvedValue(mockData);

      const { result } = renderHook(() => useUncertaintyEstimate('model-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      await result.current.refetch();

      expect(mockGetEstimate).toHaveBeenCalledTimes(2);
    });
  });
});
