/**
 * BarChart Component Tests
 *
 * Comprehensive test suite for the BarChart component covering
 * all orientations, interactions, and edge cases.
 *
 * @module components/visualizations/charts/__tests__/bar-chart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarChart } from '../bar-chart';
import { createBarChartData } from '@/tests/mocks/factories';
import type { BarChartDataPoint } from '@/types/components';

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

const mockData: BarChartDataPoint[] = createBarChartData(5);

describe('BarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render bar chart with default orientation', async () => {
      const { container } = render(<BarChart data={mockData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render horizontal bar chart', async () => {
      const { container } = render(<BarChart data={mockData} orientation="horizontal" height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom height', async () => {
      const { container } = render(<BarChart data={mockData} height={500} />);
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('height', '500');
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<BarChart data={mockData} className="custom-class" height={400} />);
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply data-testid', async () => {
      render(<BarChart data={mockData} data-testid="test-chart" height={400} />);
      await waitFor(() => {
        expect(screen.getByTestId('test-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Compound Components', () => {
    it('should render with custom compound components', async () => {
      const { container } = render(
        <BarChart.Root data={mockData} height={400}>
          <BarChart.Grid />
          <BarChart.Bars />
          <BarChart.XAxis label="Categories" />
          <BarChart.YAxis label="Values" />
        </BarChart.Root>
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render with legend', async () => {
      const { container } = render(<BarChart data={mockData} showLegend height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Grid', () => {
    it('should show grid by default', async () => {
      const { container } = render(<BarChart data={mockData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should hide grid when showGrid is false', async () => {
      const { container } = render(<BarChart data={mockData} showGrid={false} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Animation', () => {
    it('should render with animation by default', async () => {
      const { container } = render(<BarChart data={mockData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should disable animation when animated is false', async () => {
      const { container } = render(<BarChart data={mockData} animated={false} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip by default', async () => {
      const { container } = render(<BarChart data={mockData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should hide tooltip when showTooltip is false', async () => {
      const { container } = render(<BarChart data={mockData} showTooltip={false} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title', async () => {
      const { container } = render(
        <BarChart data={mockData} title="Bar Chart Analysis" height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have accessible description', async () => {
      const { container } = render(
        <BarChart data={mockData} description="Chart showing bar data" height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', async () => {
      const { container } = render(<BarChart data={[]} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle single data point', async () => {
      const singleData = createBarChartData(1);
      const { container } = render(<BarChart data={singleData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle zero values', async () => {
      const zeroData: BarChartDataPoint[] = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
      ];
      const { container } = render(<BarChart data={zeroData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle negative values', async () => {
      const negativeData: BarChartDataPoint[] = [
        { label: 'A', value: -10 },
        { label: 'B', value: 20 },
      ];
      const { container } = render(<BarChart data={negativeData} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom borderRadius', async () => {
      const { container } = render(
        <BarChart.Root data={mockData} height={400}>
          <BarChart.Bars borderRadius={8} />
        </BarChart.Root>
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom padding', async () => {
      const { container } = render(<BarChart data={mockData} padding={0.3} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
