/**
 * useSafety Hook Tests
 *
 * Comprehensive test suite for the useSafety hooks.
 *
 * @module hooks/__tests__/useSafety.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMonitors,
  useMonitorOutput,
  useMitigationState,
  useSafetyTimeline,
  useFilterAction,
  useSafetyStatus,
} from '../useSafety';
import { createMonitorOutput, createSafetyMarginTimeline } from '@/tests/mocks/factories';
import { api, wsClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => {
  const mockApi = {
    safety: {
      getMonitors: vi.fn(),
      getMonitor: vi.fn(),
      getMitigationState: vi.fn(),
      getTimeline: vi.fn(),
      filterAction: vi.fn(),
    },
  };
  const mockWsClient = {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return {
    api: mockApi,
    wsClient: mockWsClient,
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

describe('useSafety hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMonitors', () => {
    it('should fetch monitors', async () => {
      const mockData = [createMonitorOutput({ monitor_id: 'monitor-1' })];
      vi.mocked(api.safety.getMonitors).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMonitors(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should handle loading state', () => {
      vi.mocked(api.safety.getMonitors).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMonitors(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch');
      vi.mocked(api.safety.getMonitors).mockRejectedValue(mockError);

      const { result } = renderHook(() => useMonitors(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useMonitorOutput', () => {
    it('should fetch single monitor', async () => {
      const mockData = createMonitorOutput({ monitor_id: 'monitor-1' });
      vi.mocked(api.safety.getMonitor).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMonitorOutput('monitor-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useMitigationState', () => {
    it('should fetch mitigation state', async () => {
      const mockData = {
        state: 'nominal' as const,
      };
      vi.mocked(api.safety.getMitigationState).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMitigationState(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useSafetyTimeline', () => {
    it('should fetch safety timeline', async () => {
      const mockData = [createSafetyMarginTimeline()];
      vi.mocked(api.safety.getTimeline).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSafetyTimeline({ limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useFilterAction', () => {
    it('should filter action mutation', async () => {
      const mockData = {
        action: [0.5, 0.3],
        was_modified: true,
        constraint_margins: { speed: 0.2, steer: 0.1 },
        fallback_used: false,
      };
      vi.mocked(api.safety.filterAction).mockResolvedValue(mockData);

      const { result } = renderHook(() => useFilterAction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        action: [0.5, 0.3],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.safety.filterAction).toHaveBeenCalled();
    });
  });

  describe('useSafetyStatus', () => {
    it('should compute safety status', async () => {
      const mockMonitors = [
        createMonitorOutput({ monitor_id: 'monitor-1', triggered: false }),
        createMonitorOutput({ monitor_id: 'monitor-2', triggered: true, severity: 0.8 }),
      ];
      const mockMitigation = {
        state: 'nominal' as const,
      };

      vi.mocked(api.safety.getMonitors).mockResolvedValue(mockMonitors);
      vi.mocked(api.safety.getMitigationState).mockResolvedValue(mockMitigation);

      const { result } = renderHook(() => useSafetyStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('nominal');
      expect(result.current.triggeredCount).toBe(1);
      expect(result.current.maxSeverity).toBe(0.8);
    });
  });
});
