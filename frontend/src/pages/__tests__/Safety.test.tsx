/**
 * Safety Page Tests
 *
 * Comprehensive test suite for the Safety page component.
 *
 * @module pages/__tests__/Safety.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Safety from '../Safety';
import * as safetyHooks from '@/hooks/useSafety';
import { createMonitorOutput } from '@/tests/mocks/factories';

vi.mock('@/hooks/useSafety');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockMonitors = [
  createMonitorOutput({
    monitor_id: 'monitor-1',
    triggered: false,
    severity: 0.2,
    message: 'Normal operation',
  }),
  createMonitorOutput({
    monitor_id: 'monitor-2',
    triggered: true,
    severity: 0.8,
    message: 'High risk detected',
  }),
];

describe('Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safetyHooks.useMonitors).mockReturnValue({
      data: mockMonitors,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(safetyHooks.useMitigationState).mockReturnValue({
      data: {
        state: 'nominal',
        safety_margin: 0.8,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(safetyHooks.useSafetyTimeline).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);
  });

  describe('Rendering', () => {
    it('should render safety page header', () => {
      render(<Safety />, { wrapper: createWrapper() });
      // Use getAllByRole since there might be multiple headings with this text
      const headings = screen.getAllByRole('heading', { name: /safety monitor/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render monitors list', async () => {
      render(<Safety />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /safety monitors/i })).toBeInTheDocument();
      });
    });

    it('should render safety status', async () => {
      render(<Safety />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/nominal/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      vi.mocked(safetyHooks.useMonitors).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      render(<Safety />, { wrapper: createWrapper() });
      // Use getAllByRole and check first occurrence since there might be multiple headings
      const headings = screen.getAllByRole('heading', { name: /safety monitor/i });
      expect(headings.length).toBeGreaterThan(0);
      // Check for skeleton loading indicators by role
      const skeletons = screen.getAllByRole('status', { name: /loading/i });
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
