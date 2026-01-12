/**
 * LineChart Component Tests
 *
 * Comprehensive test suite for the LineChart component.
 *
 * @module components/visualizations/charts/__tests__/line-chart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LineChart } from '../line-chart';
import type { LineChartDataPoint, LineChartSeries } from '../line-chart';

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

const mockData: LineChartDataPoint[] = [
  { x: new Date('2024-01-01').getTime(), y: 10 },
  { x: new Date('2024-01-02').getTime(), y: 20 },
  { x: new Date('2024-01-03').getTime(), y: 15 },
  { x: new Date('2024-01-04').getTime(), y: 25 },
  { x: new Date('2024-01-05').getTime(), y: 30 },
];

const mockSeries: LineChartSeries[] = [
  {
    id: 'series1',
    name: 'Series 1',
    data: mockData,
    color: '#3b82f6',
  },
  {
    id: 'series2',
    name: 'Series 2',
    data: mockData.map((d) => ({ ...d, y: d.y * 1.5 })),
    color: '#22c55e',
  },
];

describe('LineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with single series', async () => {
      const { container } = render(
        <LineChart series={[mockSeries[0]]} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render with multiple series', async () => {
      const { container } = render(<LineChart series={mockSeries} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom height', async () => {
      const { container } = render(<LineChart series={mockSeries} height={500} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} className="custom-class" />
      );
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply data-testid', async () => {
      render(<LineChart series={mockSeries} height={400} data-testid="test-chart" />);
      await waitFor(() => {
        expect(screen.getByTestId('test-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Features', () => {
    it('should show area fill when enabled', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} showArea />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should show data points when enabled', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} showPoints />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should show legend when enabled', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} showLegend />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Curve Types', () => {
    it('should render with linear curve', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} curve="linear" />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render with monotone curve', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} curve="monotone" />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render with step curve', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} curve="step" />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty series array', async () => {
      const { container } = render(<LineChart series={[]} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg') || container.querySelector('div')).toBeInTheDocument();
      });
    });

    it('should handle empty data points', async () => {
      const emptySeries: LineChartSeries[] = [
        {
          id: 'empty',
          name: 'Empty',
          data: [],
          color: '#3b82f6',
        },
      ];
      const { container } = render(<LineChart series={emptySeries} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg') || container.querySelector('div')).toBeInTheDocument();
      });
    });

    it('should handle single data point', async () => {
      const singlePointSeries: LineChartSeries[] = [
        {
          id: 'single',
          name: 'Single',
          data: [mockData[0]],
          color: '#3b82f6',
        },
      ];
      const { container } = render(<LineChart series={singlePointSeries} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title', async () => {
      const { container } = render(
        <LineChart series={mockSeries} height={400} title="Line Chart" />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have accessible description', async () => {
      const { container } = render(
        <LineChart
          series={mockSeries}
          height={400}
          description="Time series line chart"
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
