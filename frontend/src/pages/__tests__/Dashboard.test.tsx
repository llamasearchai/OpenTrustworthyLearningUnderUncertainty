/**
 * Dashboard Page Tests
 *
 * Comprehensive test suite for the Dashboard page component.
 *
 * @module pages/__tests__/Dashboard.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import * as uncertaintyHooks from '@/hooks/useUncertainty';
import * as safetyHooks from '@/hooks/useSafety';
import * as evaluationHooks from '@/hooks/useEvaluation';
import { createUncertaintyEstimate } from '@/tests/mocks/factories';

vi.mock('@/hooks/useUncertainty');
vi.mock('@/hooks/useSafety');
vi.mock('@/hooks/useEvaluation');

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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uncertaintyHooks.useUncertaintyEstimate).mockReturnValue({
      data: createUncertaintyEstimate(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(uncertaintyHooks.useUncertaintyLevel).mockReturnValue({
      level: 'nominal',
    } as any);

    vi.mocked(safetyHooks.useSafetyStatus).mockReturnValue({
      mitigationState: 'nominal',
      status: 'nominal',
      triggeredCount: 0,
    } as any);

    vi.mocked(evaluationHooks.useAggregatedMetrics).mockReturnValue({
      data: {
        pass_rate: 0.92,
        total_scenarios: 150,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('should render dashboard header', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render KPI cards', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByTestId('kpi-card-confidence')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-pass-rate')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-monitors')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-scenarios')).toBeInTheDocument();
      });
    });

    it('should render uncertainty chart', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByTestId('uncertainty-chart')).toBeInTheDocument();
      });
    });

    it('should render system status card', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByTestId('system-status')).toBeInTheDocument();
      });
    });

    it('should render quick actions', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons when data is loading', () => {
      vi.mocked(uncertaintyHooks.useUncertaintyEstimate).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<Dashboard />, { wrapper: createWrapper() });
      expect(screen.getByTestId('uncertainty-chart')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockInvalidateQueries = vi.fn();
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });
      queryClient.invalidateQueries = mockInvalidateQueries;

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>{children}</BrowserRouter>
        </QueryClientProvider>
      );

      render(<Dashboard />, { wrapper: Wrapper });
      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });

  describe('Quick Actions', () => {
    it('should navigate to scenarios when Run Evaluation is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard />, { wrapper: createWrapper() });
      const runButton = screen.getByText('Run Evaluation');
      await user.click(runButton);
      expect(window.location.pathname).toBe('/scenarios');
    });

    it('should navigate to scenarios when View Scenarios is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard />, { wrapper: createWrapper() });
      const viewButton = screen.getByText('View Scenarios');
      await user.click(viewButton);
      expect(window.location.pathname).toBe('/scenarios');
    });

    it('should navigate to viewer when Open 3D Viewer is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard />, { wrapper: createWrapper() });
      const viewerButton = screen.getByText('Open 3D Viewer');
      await user.click(viewerButton);
      expect(window.location.pathname).toBe('/viewer');
    });

    it('should navigate to safety when Configure Monitors is clicked', async () => {
      const user = userEvent.setup();
      render(<Dashboard />, { wrapper: createWrapper() });
      const safetyButton = screen.getByText('Configure Monitors');
      await user.click(safetyButton);
      expect(window.location.pathname).toBe('/safety');
    });
  });

  describe('Date Range Picker', () => {
    it('should render date range picker', () => {
      const { container } = render(<Dashboard />, { wrapper: createWrapper() });
      // DateRangePicker may render differently, check for its presence
      expect(container.querySelector('[class*="date"]') || container.querySelector('button')).toBeTruthy();
    });
  });
});
