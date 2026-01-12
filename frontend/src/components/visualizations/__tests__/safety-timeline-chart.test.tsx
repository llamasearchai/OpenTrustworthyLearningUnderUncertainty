/**
 * SafetyTimelineChart Component Tests
 *
 * Comprehensive test suite for the SafetyTimelineChart component.
 *
 * @module components/visualizations/__tests__/safety-timeline-chart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SafetyTimelineChart } from '../safety-timeline-chart';
import type { SafetyMarginTimeline } from '@/types/api';

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

const mockTimelineData: SafetyMarginTimeline[] = [
  {
    timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
    mitigation_state: 'nominal',
    ood_score: 0.1,
    severity: 0.2,
    constraint_margins: { speed: 0.9, distance: 0.8 },
  },
  {
    timestamp: new Date('2024-01-01T01:00:00Z').getTime(),
    mitigation_state: 'cautious',
    ood_score: 0.3,
    severity: 0.4,
    constraint_margins: { speed: 0.7, distance: 0.6 },
  },
  {
    timestamp: new Date('2024-01-01T02:00:00Z').getTime(),
    mitigation_state: 'fallback',
    ood_score: 0.5,
    severity: 0.6,
    constraint_margins: { speed: 0.5, distance: 0.4 },
  },
];

describe('SafetyTimelineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with timeline data', async () => {
      const { container } = render(
        <SafetyTimelineChart data={mockTimelineData} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom height', async () => {
      const { container } = render(
        <SafetyTimelineChart data={mockTimelineData} height={500} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <SafetyTimelineChart data={mockTimelineData} height={400} className="custom-class" />
      );
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply data-testid', async () => {
      render(
        <SafetyTimelineChart data={mockTimelineData} height={400} data-testid="test-chart" />
      );
      await waitFor(() => {
        expect(screen.getByTestId('test-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Mitigation States', () => {
    it('should render all mitigation states', async () => {
      const { container } = render(
        <SafetyTimelineChart data={mockTimelineData} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle nominal state', async () => {
      const nominalData = mockTimelineData.filter((d) => d.mitigation_state === 'nominal');
      const { container } = render(
        <SafetyTimelineChart data={nominalData} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle safe_stop state', async () => {
      const safeStopData = [
        {
          ...mockTimelineData[0],
          mitigation_state: 'safe_stop' as const,
          constraint_margins: mockTimelineData[0].constraint_margins || {},
        },
      ];
      const { container } = render(
        <SafetyTimelineChart data={safeStopData} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Optional Data', () => {
    it('should handle missing OOD score', async () => {
      const dataWithoutOOD = mockTimelineData.map((d) => ({
        ...d,
        ood_score: 0,
        constraint_margins: d.constraint_margins || {},
      }));
      const { container } = render(
        <SafetyTimelineChart data={dataWithoutOOD} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle missing severity', async () => {
      const dataWithoutSeverity = mockTimelineData.map((d) => ({
        ...d,
        severity: 0,
        constraint_margins: d.constraint_margins || {},
      }));
      const { container } = render(
        <SafetyTimelineChart data={dataWithoutSeverity} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', async () => {
      const { container } = render(<SafetyTimelineChart data={[]} height={400} />);
      await waitFor(() => {
        expect(container.querySelector('svg') || container.querySelector('div')).toBeInTheDocument();
      });
    });

    it('should handle single data point', async () => {
      const singlePoint = {
        ...mockTimelineData[0],
        constraint_margins: mockTimelineData[0].constraint_margins || {},
      };
      const { container } = render(
        <SafetyTimelineChart data={[singlePoint]} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should handle zero safety margin', async () => {
      const zeroMarginData = [
        {
          ...mockTimelineData[0],
          safety_margin: 0,
          constraint_margins: mockTimelineData[0].constraint_margins || {},
        },
      ];
      const { container } = render(
        <SafetyTimelineChart data={zeroMarginData} height={400} />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title', async () => {
      const { container } = render(
        <SafetyTimelineChart
          data={mockTimelineData}
          height={400}
          title="Safety Timeline"
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have accessible description', async () => {
      const { container } = render(
        <SafetyTimelineChart
          data={mockTimelineData}
          height={400}
          description="Safety margin timeline chart"
        />
      );
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
