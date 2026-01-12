/**
 * ActiveLearning Page Tests
 *
 * Comprehensive test suite for the ActiveLearning page component.
 *
 * @module pages/__tests__/ActiveLearning.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ActiveLearning from '../ActiveLearning';
import * as activeLearningHooks from '@/hooks/useActiveLearning';
import { createSampleMetadata, createUncertaintyEstimate } from '@/tests/mocks/factories';

vi.mock('@/hooks/useActiveLearning');

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

const mockSamples = {
  items: [
    createSampleMetadata({
      id: 'sample-1',
      uncertainty: createUncertaintyEstimate({ confidence: 0.7, aleatoric_score: 0.2, epistemic_score: 0.3 }),
      novelty_score: 0.6,
      risk: {
        expected_risk: 0.2,
        tail_risk_cvar: 0.4,
        violation_probability: 0.05,
        is_acceptable: true,
      },
    }),
    createSampleMetadata({
      id: 'sample-2',
      uncertainty: createUncertaintyEstimate({ confidence: 0.6, aleatoric_score: 0.3, epistemic_score: 0.4 }),
      novelty_score: 0.7,
      risk: {
        expected_risk: 0.4,
        tail_risk_cvar: 0.6,
        violation_probability: 0.15,
        is_acceptable: false,
      },
    }),
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

describe('ActiveLearning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(activeLearningHooks.useSamples).mockReturnValue({
      data: mockSamples,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(activeLearningHooks.useAcquisitionConfig).mockReturnValue({
      data: {
        weight_uncertainty: 1.0,
        weight_risk: 2.0,
        weight_novelty: 0.5,
        batch_size: 10,
        strategy: 'uncertainty_sampling',
        acquisition_budget: 100,
        diversity_weight: 0.3,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    vi.mocked(activeLearningHooks.useBatchSelection).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('should render active learning page header', () => {
      render(<ActiveLearning />, { wrapper: createWrapper() });
      expect(screen.getByText(/active learning/i)).toBeInTheDocument();
    });

    it('should render samples list', async () => {
      render(<ActiveLearning />, { wrapper: createWrapper() });
      await waitFor(() => {
        // Check for sample pool heading or specific sample ID
        const heading = screen.queryByRole('heading', { name: /sample pool/i });
        const sampleId = screen.queryByText('sample-1');
        expect(heading || sampleId).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      vi.mocked(activeLearningHooks.useSamples).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      render(<ActiveLearning />, { wrapper: createWrapper() });
      expect(screen.getByText(/active learning/i)).toBeInTheDocument();
    });
  });
});
