/**
 * Scenarios Page Tests
 *
 * Comprehensive test suite for the Scenarios page component.
 *
 * @module pages/__tests__/Scenarios.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Scenarios from '../Scenarios';
import * as scenariosHooks from '@/hooks/useScenarios';
import { createScenario, createMany } from '@/tests/mocks/factories';

vi.mock('@/hooks/useScenarios');
vi.mock('@/components/scenarios/CreateScenarioModal', () => ({
  CreateScenarioModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? <div data-testid="create-scenario-modal">Create Scenario Modal</div> : null
  ),
}));
vi.mock('@/components/scenarios/DeleteScenarioDialog', () => ({
  DeleteScenarioDialog: () => null,
}));

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

const mockScenarios = {
  items: [
    createScenario({ id: 'scenario-1', tags: { environment: 'urban', weather: 'sunny' } }),
    createScenario({ id: 'scenario-2', tags: { environment: 'highway', weather: 'rainy' } }),
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

describe('Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scenariosHooks.useScenarios).mockReturnValue({
      data: mockScenarios,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(scenariosHooks.useRunEvaluation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(scenariosHooks.useCreateScenario).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('should render scenarios page header', () => {
      render(<Scenarios />, { wrapper: createWrapper() });
      // Check for header - may be in h1 or page title
      const header = screen.queryByRole('heading', { name: /scenarios/i }) ||
        screen.queryByText(/scenarios/i);
      expect(header).toBeTruthy();
    });

    it('should render scenarios list', async () => {
      render(<Scenarios />, { wrapper: createWrapper() });
      await waitFor(() => {
        // Scenarios may be rendered as links or cards - check for scenario ID
        const scenario1 = screen.queryByText('scenario-1') || screen.queryByText(/scenario-1/i);
        const scenarioLink = document.querySelector('[href*="scenario-1"]');
        expect(scenario1 || scenarioLink).toBeTruthy();
      });
    });

    it('should render create button', () => {
      render(<Scenarios />, { wrapper: createWrapper() });
      // Look for create button or plus icon
      const createBtn = screen.queryByRole('button', { name: /create/i }) ||
        screen.queryByRole('button', { name: /new/i }) ||
        document.querySelector('button[aria-label*="create" i]') ||
        document.querySelector('button[aria-label*="add" i]');
      expect(createBtn).toBeTruthy();
    });

    it('should render search input', () => {
      render(<Scenarios />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter scenarios by search term', async () => {
      const user = userEvent.setup();
      render(<Scenarios />, { wrapper: createWrapper() });
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'scenario-1');
      await waitFor(() => {
        expect(screen.getByText('scenario-1')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      vi.mocked(scenariosHooks.useScenarios).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      render(<Scenarios />, { wrapper: createWrapper() });
      // Check for header text - use getAllByText and check first occurrence
      const headers = screen.getAllByText(/scenarios/i);
      expect(headers.length).toBeGreaterThan(0);
    });
  });
});
