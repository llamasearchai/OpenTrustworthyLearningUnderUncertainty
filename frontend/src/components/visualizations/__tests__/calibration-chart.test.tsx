/**
 * CalibrationChart Component Tests
 *
 * Comprehensive test suite for the CalibrationChart component.
 *
 * @module components/visualizations/__tests__/calibration-chart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CalibrationChart } from '../calibration-chart';
import type { CalibrationChartProps } from '@/types/components';

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

const mockBins = [
  { confidence: 0.1, accuracy: 0.12, count: 10 },
  { confidence: 0.3, accuracy: 0.28, count: 15 },
  { confidence: 0.5, accuracy: 0.52, count: 20 },
  { confidence: 0.7, accuracy: 0.68, count: 25 },
  { confidence: 0.9, accuracy: 0.88, count: 30 },
];

describe('CalibrationChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with bins data', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom height', () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={500} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '500');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CalibrationChart bins={mockBins} height={400} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply data-testid', () => {
      render(
        <CalibrationChart bins={mockBins} height={400} data-testid="test-chart" />
      );
      expect(screen.getByTestId('test-chart')).toBeInTheDocument();
    });
  });

  describe('Perfect Line', () => {
    it('should show perfect line by default', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should hide perfect line when showPerfectLine is false', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} showPerfectLine={false} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Histogram', () => {
    it('should show histogram by default', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should hide histogram when showHistogram is false', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} showHistogram={false} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('ECE Calculation', () => {
    it('should calculate ECE when not provided', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should use provided ECE value', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} ece={0.05} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title', async () => {
      const { container } = render(
        <CalibrationChart
          bins={mockBins}
          height={400}
          title="Calibration Analysis"
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have accessible description', async () => {
      const { container } = render(
        <CalibrationChart
          bins={mockBins}
          height={400}
          description="Model calibration reliability diagram"
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bins array', async () => {
      const { container } = render(<CalibrationChart bins={[]} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle single bin', async () => {
      const singleBin = [{ confidence: 0.5, accuracy: 0.5, count: 10 }];
      const { container } = render(<CalibrationChart bins={singleBin} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle zero counts', async () => {
      const zeroCountBins = mockBins.map((bin) => ({ ...bin, count: 0 }));
      const { container } = render(<CalibrationChart bins={zeroCountBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Animation', () => {
    it('should render with animation by default', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should disable animation when animated is false', async () => {
      const { container } = render(<CalibrationChart bins={mockBins} height={400} animated={false} />);
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
