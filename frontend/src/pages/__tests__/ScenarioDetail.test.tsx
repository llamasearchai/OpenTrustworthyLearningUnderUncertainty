/**
 * ScenarioDetail Page Tests
 *
 * Comprehensive test suite for the ScenarioDetail page component.
 *
 * @module pages/__tests__/ScenarioDetail.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ScenarioDetail from '../ScenarioDetail';
import * as evaluationHooks from '@/hooks/useEvaluation';
import { createScenario } from '@/tests/mocks/factories';

vi.mock('@/hooks/useEvaluation');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'scenario-1' }),
  };
});

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

const mockScenario = createScenario({
  id: 'scenario-1',
  tags: { environment: 'urban', weather: 'sunny' },
});

describe('ScenarioDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evaluationHooks.useScenario).mockReturnValue({
      data: mockScenario,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(evaluationHooks.useEvaluationResults).mockReturnValue({
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(evaluationHooks.useRunEvaluation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('should render scenario detail page', () => {
      render(<ScenarioDetail />, { wrapper: createWrapper() });
      // Check for "Scenarios" link or scenario ID
      expect(screen.getByText(/scenarios/i)).toBeInTheDocument();
    });

    it('should render scenario ID', async () => {
      render(<ScenarioDetail />, { wrapper: createWrapper() });
      await waitFor(() => {
        // Scenario ID appears multiple times (breadcrumb and heading)
        const scenarioIds = screen.getAllByText('scenario-1');
        expect(scenarioIds.length).toBeGreaterThan(0);
      });
    });

    it('should render scenario tags', async () => {
      render(<ScenarioDetail />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/urban/i)).toBeInTheDocument();
        expect(screen.getByText(/sunny/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      vi.mocked(evaluationHooks.useScenario).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      render(<ScenarioDetail />, { wrapper: createWrapper() });
      // Loading state shows skeletons - check for Skeleton component by role
      const skeletons = screen.getAllByRole('status', { name: /loading/i });
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
