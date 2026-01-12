/**
 * LineChart Component Stories
 *
 * Comprehensive Storybook stories for the LineChart component demonstrating
 * single series, multiple series, brush selection, and various configurations.
 *
 * @module components/visualizations/charts/LineChart.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, expect, fn } from '@storybook/test';
import { LineChart } from './line-chart';
import type { LineChartSeries } from '@/types/components';
import * as React from 'react';

// ============================================================================
// Sample Data Generators
// ============================================================================

const generateTimeSeries = (
  count: number,
  options: { baseValue?: number; variance?: number; trend?: number } = {}
): Array<{ x: Date; y: number }> => {
  const { baseValue = 50, variance = 20, trend = 0 } = options;
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => ({
    x: new Date(now - (count - i - 1) * hourMs),
    y: baseValue + Math.random() * variance - variance / 2 + trend * i,
  }));
};

const generateNumericSeries = (
  count: number,
  options: { startX?: number; baseValue?: number; variance?: number } = {}
): Array<{ x: number; y: number }> => {
  const { startX = 0, baseValue = 50, variance = 20 } = options;

  return Array.from({ length: count }, (_, i) => ({
    x: startX + i,
    y: baseValue + Math.random() * variance - variance / 2,
  }));
};

// ============================================================================
// Sample Data
// ============================================================================

const singleSeriesData: LineChartSeries[] = [
  {
    id: 'metrics',
    name: 'Model Performance',
    data: generateTimeSeries(24, { baseValue: 85, variance: 10, trend: 0.2 }),
    color: '#3b82f6',
  },
];

const multipleSeriesData: LineChartSeries[] = [
  {
    id: 'accuracy',
    name: 'Accuracy',
    data: generateTimeSeries(24, { baseValue: 92, variance: 5, trend: 0.1 }),
    color: '#22c55e',
  },
  {
    id: 'precision',
    name: 'Precision',
    data: generateTimeSeries(24, { baseValue: 88, variance: 8, trend: 0.05 }),
    color: '#3b82f6',
  },
  {
    id: 'recall',
    name: 'Recall',
    data: generateTimeSeries(24, { baseValue: 85, variance: 10, trend: -0.02 }),
    color: '#f59e0b',
  },
  {
    id: 'f1',
    name: 'F1 Score',
    data: generateTimeSeries(24, { baseValue: 86, variance: 7, trend: 0.03 }),
    color: '#8b5cf6',
  },
];

const uncertaintySeriesData: LineChartSeries[] = [
  {
    id: 'aleatoric',
    name: 'Aleatoric Uncertainty',
    data: generateTimeSeries(50, { baseValue: 0.15, variance: 0.1 }),
    color: '#3b82f6',
  },
  {
    id: 'epistemic',
    name: 'Epistemic Uncertainty',
    data: generateTimeSeries(50, { baseValue: 0.25, variance: 0.15 }),
    color: '#8b5cf6',
  },
];

const brushSeriesData: LineChartSeries[] = [
  {
    id: 'training-loss',
    name: 'Training Loss',
    data: Array.from({ length: 100 }, (_, i) => ({
      x: i + 1,
      y: 2.5 * Math.exp(-i / 30) + 0.1 + Math.random() * 0.05,
    })),
    color: '#3b82f6',
  },
  {
    id: 'validation-loss',
    name: 'Validation Loss',
    data: Array.from({ length: 100 }, (_, i) => ({
      x: i + 1,
      y: 2.5 * Math.exp(-i / 30) + 0.15 + Math.random() * 0.08,
    })),
    color: '#ef4444',
  },
];

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof LineChart> = {
  title: 'Components/Visualizations/LineChart',
  component: LineChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A versatile line chart component for time-series and numeric data visualization.
Built on Visx for performant SVG rendering.

## Features
- Single or multiple series support
- Time-based or numeric x-axis
- Interactive tooltips with crosshair
- Brush selection for zooming
- Configurable curve types (linear, monotone, step, natural)
- Area fill option
- Data point markers
- Legend positioning
- Responsive sizing
- Animation support

## Usage

\`\`\`tsx
import { LineChart } from '@/components/visualizations/charts/line-chart';

<LineChart
  series={[{
    id: 'performance',
    name: 'Model Performance',
    data: performanceData,
    color: '#3b82f6',
  }]}
  height={300}
  xAxis={{ label: 'Time', type: 'time' }}
  yAxis={{ label: 'Score (%)' }}
  showTooltip
  showLegend
/>
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'svg-img-alt', enabled: true },
        ],
      },
    },
  },
  argTypes: {
    series: {
      description: 'Array of data series to plot',
      control: false,
      table: {
        type: { summary: 'LineChartSeries[]' },
      },
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'number', min: 100, max: 800 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '300' },
      },
    },
    xAxis: {
      description: 'X-axis configuration',
      control: false,
      table: {
        type: { summary: 'AxisConfig & { type?: "linear" | "time" }' },
      },
    },
    yAxis: {
      description: 'Y-axis configuration',
      control: false,
      table: {
        type: { summary: 'AxisConfig' },
      },
    },
    enableBrush: {
      description: 'Enable brush selection for zooming',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    showArea: {
      description: 'Show area fill under lines',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    showPoints: {
      description: 'Show data point markers',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    curve: {
      description: 'Line curve type',
      control: 'select',
      options: ['linear', 'monotone', 'step', 'natural'],
      table: {
        type: { summary: 'linear | monotone | step | natural' },
        defaultValue: { summary: 'monotone' },
      },
    },
    showTooltip: {
      description: 'Enable interactive tooltips',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    showLegend: {
      description: 'Show chart legend',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    showGrid: {
      description: 'Show grid lines',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    animated: {
      description: 'Enable animations',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    title: {
      description: 'Chart title',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    description: {
      description: 'Chart description for accessibility',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    onDataPointClick: {
      description: 'Callback when a data point is clicked',
      action: 'dataPointClicked',
      table: {
        type: { summary: '(data: unknown, index: number) => void' },
      },
    },
    onBrushChange: {
      description: 'Callback when brush selection changes',
      action: 'brushChanged',
      table: {
        type: { summary: '(domain: [number, number] | null) => void' },
      },
    },
  },
  args: {
    height: 350,
    showTooltip: true,
    showLegend: true,
    showGrid: true,
    animated: true,
    curve: 'monotone',
  },
};

export default meta;
type Story = StoryObj<typeof LineChart>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * Default line chart with a single series.
 */
export const Default: Story = {
  args: {
    series: singleSeriesData,
    title: 'Model Performance Over Time',
    description: 'Performance metrics tracked over the last 24 hours',
    xAxis: {
      label: 'Time',
    },
    yAxis: {
      label: 'Performance (%)',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic line chart showing a single metric over time with interactive tooltip.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify chart is rendered
    const svg = canvas.getByRole('img');
    await expect(svg).toBeInTheDocument();
  },
};

// ============================================================================
// Multiple Series Story
// ============================================================================

/**
 * Line chart with multiple series and legend.
 */
export const MultipleSeries: Story = {
  args: {
    series: multipleSeriesData,
    title: 'Model Metrics Comparison',
    description: 'Multiple performance metrics tracked simultaneously',
    xAxis: {
      label: 'Time',
    },
    yAxis: {
      label: 'Score (%)',
    },
    showLegend: true,
    legendPosition: 'bottom',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple series plotted on the same chart with a legend for identification.',
      },
    },
  },
};

// ============================================================================
// With Area Fill Story
// ============================================================================

/**
 * Line chart with area fill under the lines.
 */
export const WithAreaFill: Story = {
  args: {
    series: uncertaintySeriesData,
    title: 'Uncertainty Decomposition',
    xAxis: {
      label: 'Time',
    },
    yAxis: {
      label: 'Uncertainty',
    },
    showArea: true,
    curve: 'monotone',
  },
  parameters: {
    docs: {
      description: {
        story: 'Line chart with gradient area fill for better visualization of values.',
      },
    },
  },
};

// ============================================================================
// With Data Points Story
// ============================================================================

/**
 * Line chart with visible data point markers.
 */
export const WithDataPoints: Story = {
  args: {
    series: [{
      ...singleSeriesData[0],
      data: singleSeriesData[0].data.slice(0, 12),
    }],
    title: 'Performance with Data Points',
    xAxis: {
      label: 'Time',
    },
    yAxis: {
      label: 'Performance (%)',
    },
    showPoints: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows individual data points as markers on the line.',
      },
    },
  },
};

// ============================================================================
// With Brush Selection Story
// ============================================================================

/**
 * Line chart with brush selection for zooming.
 */
export const WithBrush: Story = {
  render: function BrushRender() {
    const [brushDomain, setBrushDomain] = React.useState<[number, number] | null>(null);

    return (
      <div className="space-y-4">
        {brushDomain && (
          <div className="text-sm text-muted-foreground">
            Selected epoch range: {Math.round(brushDomain[0])} - {Math.round(brushDomain[1])}
          </div>
        )}
        <LineChart
          series={brushSeriesData}
          height={350}
          title="Training Progress"
          description="Training and validation loss over epochs"
          xAxis={{
            label: 'Epoch',
          }}
          yAxis={{
            label: 'Loss',
          }}
          enableBrush
          onBrushChange={(domain) => setBrushDomain(domain)}
          showLegend
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates brush selection for zooming into specific regions of the chart. Drag to select a region.',
      },
    },
  },
};

// ============================================================================
// Curve Types Story
// ============================================================================

/**
 * Comparison of different curve types.
 */
export const CurveTypes: Story = {
  render: () => {
    const curveTypes = ['linear', 'monotone', 'step', 'natural'] as const;
    const data: LineChartSeries[] = [{
      id: 'data',
      name: 'Sample Data',
      data: generateNumericSeries(10, { baseValue: 50, variance: 30 }),
      color: '#3b82f6',
    }];

    return (
      <div className="grid grid-cols-2 gap-4">
        {curveTypes.map((curve) => (
          <div key={curve} className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 capitalize">{curve}</h3>
            <LineChart
              series={data}
              height={200}
              curve={curve}
              showGrid
              showTooltip={false}
              showLegend={false}
              xAxis={{}}
              yAxis={{}}
            />
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Comparison of available curve types: linear, monotone, step, and natural.',
      },
    },
  },
};

// ============================================================================
// Real-time Simulation Story
// ============================================================================

/**
 * Simulated real-time data updates.
 */
export const RealtimeSimulation: Story = {
  render: function RealtimeRender() {
    const [data, setData] = React.useState<LineChartSeries[]>([{
      id: 'realtime',
      name: 'Live Metrics',
      data: generateTimeSeries(20, { baseValue: 75, variance: 10 }),
      color: '#22c55e',
    }]);

    React.useEffect(() => {
      const interval = setInterval(() => {
        setData((prev) => [{
          ...prev[0],
          data: [
            ...prev[0].data.slice(-19),
            {
              x: new Date(),
              y: 75 + Math.random() * 10 - 5,
            },
          ],
        }]);
      }, 1000);

      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-muted-foreground">Live data streaming</span>
        </div>
        <LineChart
          series={data}
          height={300}
          title="Real-time Metrics"
          xAxis={{
            label: 'Time',
          }}
          yAxis={{
            label: 'Value',
          }}
          curve="monotone"
          animated={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates real-time data streaming with automatic updates every second.',
      },
    },
  },
};

// ============================================================================
// Numeric X-Axis Story
// ============================================================================

/**
 * Line chart with numeric x-axis instead of time.
 */
export const NumericXAxis: Story = {
  args: {
    series: [{
      id: 'loss',
      name: 'Training Loss',
      data: Array.from({ length: 50 }, (_, i) => ({
        x: i + 1,
        y: 2 * Math.exp(-i / 15) + 0.1 + Math.random() * 0.05,
      })),
      color: '#ef4444',
    }],
    title: 'Training Loss Curve',
    xAxis: {
      label: 'Epoch',
    },
    yAxis: {
      label: 'Loss',
    },
    showArea: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Uses a numeric x-axis (epochs) instead of time.',
      },
    },
  },
};

// ============================================================================
// Custom Styling Story
// ============================================================================

/**
 * Line chart with custom colors and styling.
 */
export const CustomStyling: Story = {
  args: {
    series: [
      {
        id: 'safe',
        name: 'Safety Margin',
        data: generateTimeSeries(24, { baseValue: 0.3, variance: 0.1 }),
        color: '#22c55e',
        strokeWidth: 3,
      },
      {
        id: 'threshold',
        name: 'Threshold',
        data: generateTimeSeries(24, { baseValue: 0.1, variance: 0 }),
        color: '#ef4444',
        strokeDasharray: '8,4',
      },
    ],
    title: 'Safety Margin Analysis',
    xAxis: {
      label: 'Time',
    },
    yAxis: {
      label: 'Margin',
    },
    showLegend: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom line colors, widths, and dashed line styles.',
      },
    },
  },
};

// ============================================================================
// Legend Positions Story
// ============================================================================

/**
 * Different legend positions.
 */
export const LegendPositions: Story = {
  render: () => {
    const positions = ['top', 'right', 'bottom', 'left'] as const;

    return (
      <div className="grid grid-cols-2 gap-4">
        {positions.map((position) => (
          <div key={position} className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 capitalize">Legend: {position}</h3>
            <LineChart
              series={multipleSeriesData.slice(0, 2)}
              height={200}
              showLegend
              legendPosition={position}
              xAxis={{}}
              yAxis={{}}
            />
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all available legend positions: top, right, bottom, left.',
      },
    },
  },
};

// ============================================================================
// Loading State Story
// ============================================================================

/**
 * Line chart in loading state.
 */
export const Loading: Story = {
  args: {
    series: [],
    height: 300,
    isLoading: true,
    title: 'Loading Chart Data',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading skeleton state while chart data is being fetched.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Line chart with accessibility features.
 */
export const Accessibility: Story = {
  args: {
    series: singleSeriesData,
    title: 'Accessible Line Chart',
    description: 'This chart shows model performance metrics over the last 24 hours, with values ranging from 80% to 95%.',
    xAxis: {
      label: 'Time (hours)',
    },
    yAxis: {
      label: 'Performance Score (%)',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper accessibility with title, description, and axis labels for screen readers.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'svg-img-alt', enabled: true },
        ],
      },
    },
  },
};

// ============================================================================
// Responsive Story
// ============================================================================

/**
 * Responsive line chart that adapts to container width.
 */
export const Responsive: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Resize the browser to see the chart adapt to different widths.
      </p>
      <div className="border rounded-lg p-4">
        <LineChart
          series={multipleSeriesData.slice(0, 2)}
          height={300}
          title="Responsive Chart"
          showLegend
          xAxis={{
            label: 'Time',
          }}
          yAxis={{
            label: 'Value',
          }}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The chart automatically adapts to its container width.',
      },
    },
  },
};
