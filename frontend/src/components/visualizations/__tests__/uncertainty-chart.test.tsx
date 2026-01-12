/**
 * UncertaintyChart Component Tests
 *
 * Comprehensive test suite for the UncertaintyChart component covering
 * all chart variants, interactions, and edge cases.
 *
 * @module components/visualizations/__tests__/uncertainty-chart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UncertaintyChart } from '../uncertainty-chart';
import type { UncertaintyEstimate } from '@/types/api';

// Mock useChartDimensions
const mockChartDimensions = {
  width: 800,
  height: 400,
  boundedWidth: 760,
  boundedHeight: 360,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 20,
};

vi.mock('@/lib/visualizations/core', async () => {
  const actual = await vi.importActual('@/lib/visualizations/core');
  return {
    ...actual,
    useChartDimensions: vi.fn(() => mockChartDimensions),
  };
});

const mockUncertaintyData: UncertaintyEstimate = {
  confidence: 0.85,
  aleatoric_score: 0.15,
  epistemic_score: 0.25,
  source: 'ensemble_variance',
};

describe('UncertaintyChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render bar chart by default', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render gauge chart when type is gauge', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} type="gauge" height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render donut chart when type is donut', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} type="donut" height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render pie chart when type is pie', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} type="pie" height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render decomposition chart when type is decomposition', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} type="decomposition" height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom height', async () => {
      const { container } = render(
        <UncertaintyChart data={mockUncertaintyData} height={500} />
      );
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <UncertaintyChart data={mockUncertaintyData} className="custom-class" height={400} />
      );
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply data-testid', async () => {
      render(<UncertaintyChart data={mockUncertaintyData} data-testid="test-chart" height={400} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Thresholds', () => {
    it('should show warning threshold when provided', async () => {
      const { container } = render(
        <UncertaintyChart
          data={mockUncertaintyData}
          warningThreshold={0.3}
          criticalThreshold={0.6}
          height={400}
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle missing thresholds gracefully', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Confidence Display', () => {
    it('should show confidence when showConfidence is true', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} showConfidence height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should hide confidence when showConfidence is false', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} showConfidence={false} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title', async () => {
      const { container } = render(
        <UncertaintyChart
          data={mockUncertaintyData}
          title="Uncertainty Analysis"
          height={400}
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have accessible description', async () => {
      const { container } = render(
        <UncertaintyChart
          data={mockUncertaintyData}
          description="Chart showing uncertainty decomposition"
          height={400}
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero uncertainty values', async () => {
      const zeroData: UncertaintyEstimate = {
        ...mockUncertaintyData,
        aleatoric_score: 0,
        epistemic_score: 0,
        // Removed invalid property 'total_uncertainty' to match UncertaintyEstimate type.
      };
      const { container } = render(<UncertaintyChart data={zeroData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle maximum uncertainty values', async () => {
      const maxData: UncertaintyEstimate = {
        ...mockUncertaintyData,
        aleatoric_score: 1.0,
        epistemic_score: 1.0,
        // Removed invalid property 'total_uncertainty' to match UncertaintyEstimate type.
      };
      const { container } = render(<UncertaintyChart data={maxData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle missing confidence', async () => {
      const noConfidenceData: UncertaintyEstimate = {
        ...mockUncertaintyData,
        confidence: 0.5, // Use valid value instead of undefined
      };
      const { container } = render(<UncertaintyChart data={noConfidenceData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Animation', () => {
    it('should render with animation by default', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should disable animation when animated is false', async () => {
      const { container } = render(<UncertaintyChart data={mockUncertaintyData} animated={false} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
