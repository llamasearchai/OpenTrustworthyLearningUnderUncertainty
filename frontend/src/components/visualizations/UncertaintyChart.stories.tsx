/**
 * UncertaintyChart Component Stories
 *
 * Comprehensive Storybook stories for the UncertaintyChart component demonstrating
 * all chart variants (bar, gauge, donut, pie, decomposition) and configurations.
 *
 * @module components/visualizations/UncertaintyChart.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { UncertaintyChart } from './uncertainty-chart';
import type { UncertaintyEstimate } from '@/types/api';
import * as React from 'react';

// ============================================================================
// Sample Data
// ============================================================================

const lowUncertaintyData: UncertaintyEstimate = {
  aleatoric_score: 0.08,
  epistemic_score: 0.05,
  confidence: 0.92,
  source: 'ensemble_variance',
};

const mediumUncertaintyData: UncertaintyEstimate = {
  aleatoric_score: 0.18,
  epistemic_score: 0.22,
  confidence: 0.72,
  source: 'mc_dropout',
};

const highUncertaintyData: UncertaintyEstimate = {
  aleatoric_score: 0.25,
  epistemic_score: 0.45,
  confidence: 0.45,
  source: 'ensemble_variance',
};

const criticalUncertaintyData: UncertaintyEstimate = {
  aleatoric_score: 0.30,
  epistemic_score: 0.55,
  confidence: 0.25,
  source: 'heteroscedastic',
};

const balancedUncertaintyData: UncertaintyEstimate = {
  aleatoric_score: 0.20,
  epistemic_score: 0.20,
  confidence: 0.65,
  source: 'ensemble_variance',
};

const aleatoricDominantData: UncertaintyEstimate = {
  aleatoric_score: 0.35,
  epistemic_score: 0.10,
  confidence: 0.68,
  source: 'heteroscedastic',
};

const epistemicDominantData: UncertaintyEstimate = {
  aleatoric_score: 0.08,
  epistemic_score: 0.42,
  confidence: 0.55,
  source: 'mc_dropout',
};

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof UncertaintyChart> = {
  title: 'Components/Visualizations/UncertaintyChart',
  component: UncertaintyChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Visualizes uncertainty decomposition (aleatoric vs epistemic) with multiple chart variants.
Essential for understanding model confidence and making informed decisions.

## Features
- 5 chart types: bar, gauge, donut, pie, decomposition
- Threshold zones with color coding (low, medium, high, critical)
- Confidence indicators
- Animated transitions
- Accessible with screen reader support

## Uncertainty Types

- **Aleatoric Uncertainty**: Inherent randomness in the data that cannot be reduced with more training data.
- **Epistemic Uncertainty**: Model uncertainty that can be reduced by collecting more data or improving the model.

## Usage

\`\`\`tsx
import { UncertaintyChart } from '@/components/visualizations/uncertainty-chart';

<UncertaintyChart
  data={uncertaintyEstimate}
  height={300}
  type="gauge"
  warningThreshold={0.3}
  criticalThreshold={0.6}
  showConfidence
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
    data: {
      description: 'Uncertainty estimate data',
      control: false,
      table: {
        type: { summary: 'UncertaintyEstimate' },
      },
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'number', min: 200, max: 600 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '300' },
      },
    },
    type: {
      description: 'Chart visualization type',
      control: 'select',
      options: ['bar', 'gauge', 'donut', 'pie', 'decomposition'],
      table: {
        type: { summary: 'bar | gauge | donut | pie | decomposition' },
        defaultValue: { summary: 'bar' },
      },
    },
    showConfidence: {
      description: 'Show confidence indicator',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    warningThreshold: {
      description: 'Threshold for warning level uncertainty',
      control: { type: 'number', min: 0, max: 1, step: 0.1 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '0.3' },
      },
    },
    criticalThreshold: {
      description: 'Threshold for critical level uncertainty',
      control: { type: 'number', min: 0, max: 1, step: 0.1 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '0.6' },
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
      description: 'Chart title for accessibility',
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
  },
  args: {
    height: 350,
    showConfidence: true,
    warningThreshold: 0.3,
    criticalThreshold: 0.6,
    animated: true,
  },
};

export default meta;
type Story = StoryObj<typeof UncertaintyChart>;

// ============================================================================
// Default Story (Bar Chart)
// ============================================================================

/**
 * Default bar chart showing aleatoric and epistemic uncertainty.
 */
export const Default: Story = {
  args: {
    data: mediumUncertaintyData,
    type: 'bar',
    title: 'Uncertainty Decomposition',
  },
  parameters: {
    docs: {
      description: {
        story: 'Bar chart visualization showing aleatoric and epistemic uncertainty with threshold zones.',
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
// Gauge Chart Story
// ============================================================================

/**
 * Gauge chart showing total uncertainty as a dial.
 */
export const GaugeChart: Story = {
  args: {
    data: mediumUncertaintyData,
    type: 'gauge',
    title: 'Uncertainty Gauge',
  },
  parameters: {
    docs: {
      description: {
        story: 'Gauge (dial) visualization showing total uncertainty with color-coded zones.',
      },
    },
  },
};

// ============================================================================
// Donut Chart Story
// ============================================================================

/**
 * Donut chart showing uncertainty decomposition proportions.
 */
export const DonutChart: Story = {
  args: {
    data: balancedUncertaintyData,
    type: 'donut',
    title: 'Uncertainty Proportions',
  },
  parameters: {
    docs: {
      description: {
        story: 'Donut chart showing the proportion of aleatoric vs epistemic uncertainty.',
      },
    },
  },
};

// ============================================================================
// Pie Chart Story
// ============================================================================

/**
 * Pie chart showing uncertainty decomposition.
 */
export const PieChart: Story = {
  args: {
    data: aleatoricDominantData,
    type: 'pie',
    title: 'Uncertainty Breakdown',
  },
  parameters: {
    docs: {
      description: {
        story: 'Pie chart visualization of uncertainty decomposition.',
      },
    },
  },
};

// ============================================================================
// Decomposition Chart Story
// ============================================================================

/**
 * Horizontal decomposition bar showing uncertainty breakdown.
 */
export const DecompositionChart: Story = {
  args: {
    data: epistemicDominantData,
    type: 'decomposition',
    title: 'Uncertainty Decomposition Analysis',
  },
  parameters: {
    docs: {
      description: {
        story: 'Horizontal stacked bar showing the decomposition of total uncertainty into aleatoric and epistemic components.',
      },
    },
  },
};

// ============================================================================
// All Chart Types Story
// ============================================================================

/**
 * All chart types side by side for comparison.
 */
export const AllChartTypes: Story = {
  render: () => {
    const types = ['bar', 'gauge', 'donut', 'pie', 'decomposition'] as const;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {types.map((type) => (
          <div key={type} className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 capitalize">{type}</h3>
            <UncertaintyChart
              data={mediumUncertaintyData}
              height={250}
              type={type}
              showConfidence
              animated={false}
            />
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'All five chart types displayed side by side with the same data for comparison.',
      },
    },
  },
};

// ============================================================================
// Uncertainty Levels Story
// ============================================================================

/**
 * Different uncertainty levels showing threshold colors.
 */
export const UncertaintyLevels: Story = {
  render: () => {
    const levels = [
      { data: lowUncertaintyData, label: 'Low Uncertainty', color: 'text-green-600' },
      { data: mediumUncertaintyData, label: 'Medium Uncertainty', color: 'text-yellow-600' },
      { data: highUncertaintyData, label: 'High Uncertainty', color: 'text-orange-600' },
      { data: criticalUncertaintyData, label: 'Critical Uncertainty', color: 'text-red-600' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {levels.map(({ data, label, color }) => (
          <div key={label} className="border rounded-lg p-4">
            <h3 className={`text-sm font-medium mb-2 ${color}`}>{label}</h3>
            <UncertaintyChart
              data={data}
              height={250}
              type="gauge"
              showConfidence
              warningThreshold={0.3}
              criticalThreshold={0.6}
            />
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how the chart displays different uncertainty levels with appropriate color coding.',
      },
    },
  },
};

// ============================================================================
// Aleatoric vs Epistemic Story
// ============================================================================

/**
 * Comparing aleatoric-dominant vs epistemic-dominant uncertainty.
 */
export const AleatoricVsEpistemic: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Aleatoric Dominant</h3>
        <p className="text-xs text-muted-foreground mb-4">
          High data uncertainty - inherent randomness that cannot be reduced with more training.
        </p>
        <UncertaintyChart
          data={aleatoricDominantData}
          height={280}
          type="decomposition"
          showConfidence
        />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Epistemic Dominant</h3>
        <p className="text-xs text-muted-foreground mb-4">
          High model uncertainty - could be reduced with more data or model improvements.
        </p>
        <UncertaintyChart
          data={epistemicDominantData}
          height={280}
          type="decomposition"
          showConfidence
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Compares aleatoric-dominant (data noise) vs epistemic-dominant (model uncertainty) scenarios with actionable insights.',
      },
    },
  },
};

// ============================================================================
// Custom Thresholds Story
// ============================================================================

/**
 * Chart with custom warning and critical thresholds.
 */
export const CustomThresholds: Story = {
  render: function ThresholdRender() {
    const [warningThreshold, setWarningThreshold] = React.useState(0.3);
    const [criticalThreshold, setCriticalThreshold] = React.useState(0.6);

    return (
      <div className="space-y-4">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm">Warning: {warningThreshold.toFixed(2)}</label>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseFloat(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Critical: {criticalThreshold.toFixed(2)}</label>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(parseFloat(e.target.value))}
              className="w-32"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <UncertaintyChart
            data={mediumUncertaintyData}
            height={300}
            type="bar"
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
            showConfidence
          />
          <UncertaintyChart
            data={mediumUncertaintyData}
            height={300}
            type="gauge"
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
            showConfidence
          />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates configurable warning and critical thresholds. Adjust sliders to see threshold zones change.',
      },
    },
  },
};

// ============================================================================
// Without Confidence Story
// ============================================================================

/**
 * Chart without confidence indicator.
 */
export const WithoutConfidence: Story = {
  args: {
    data: mediumUncertaintyData,
    type: 'bar',
    showConfidence: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the chart without the confidence indicator for simpler display.',
      },
    },
  },
};

// ============================================================================
// Animated vs Static Story
// ============================================================================

/**
 * Comparison of animated and static charts.
 */
export const AnimatedVsStatic: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Animated</h3>
        <UncertaintyChart
          data={highUncertaintyData}
          height={250}
          type="gauge"
          animated
          showConfidence
        />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Static</h3>
        <UncertaintyChart
          data={highUncertaintyData}
          height={250}
          type="gauge"
          animated={false}
          showConfidence
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Compares animated chart (with transitions) vs static rendering.',
      },
    },
  },
};

// ============================================================================
// Real-time Updates Story
// ============================================================================

/**
 * Simulated real-time uncertainty updates.
 */
export const RealtimeUpdates: Story = {
  render: function RealtimeRender() {
    const [data, setData] = React.useState<UncertaintyEstimate>(mediumUncertaintyData);

    React.useEffect(() => {
      const interval = setInterval(() => {
        const aleatoric = 0.1 + Math.random() * 0.25;
        const epistemic = 0.1 + Math.random() * 0.35;

        setData({
          aleatoric_score: aleatoric,
          epistemic_score: epistemic,

          confidence: 1 - (aleatoric + epistemic) * 0.8,
          source: 'ensemble_variance',


        });
      }, 2000);

      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-muted-foreground">Live uncertainty monitoring</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <UncertaintyChart
            data={data}
            height={300}
            type="gauge"
            showConfidence
            animated
          />
          <UncertaintyChart
            data={data}
            height={300}
            type="decomposition"
            showConfidence
            animated
          />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates real-time uncertainty monitoring with automatic updates every 2 seconds.',
      },
    },
  },
};

// ============================================================================
// Dashboard Layout Story
// ============================================================================

/**
 * Multiple charts in a dashboard layout.
 */
export const DashboardLayout: Story = {
  render: () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Uncertainty Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 col-span-2">
          <h3 className="text-sm font-medium mb-2">Overall Uncertainty</h3>
          <UncertaintyChart
            data={mediumUncertaintyData}
            height={280}
            type="decomposition"
            showConfidence
          />
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Current Level</h3>
          <UncertaintyChart
            data={mediumUncertaintyData}
            height={280}
            type="gauge"
            showConfidence
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Model A</h3>
          <UncertaintyChart
            data={lowUncertaintyData}
            height={200}
            type="donut"
            showConfidence={false}
          />
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Model B</h3>
          <UncertaintyChart
            data={mediumUncertaintyData}
            height={200}
            type="donut"
            showConfidence={false}
          />
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Model C</h3>
          <UncertaintyChart
            data={highUncertaintyData}
            height={200}
            type="donut"
            showConfidence={false}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example dashboard layout combining multiple uncertainty charts for comparing different models.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Chart with full accessibility attributes.
 */
export const Accessibility: Story = {
  args: {
    data: mediumUncertaintyData,
    type: 'bar',
    title: 'Model Uncertainty Analysis',
    description: 'Bar chart showing uncertainty decomposition. Aleatoric uncertainty: 0.18 (18%), Epistemic uncertainty: 0.22 (22%), Total: 0.40 (40%), Confidence: 72%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper accessibility with title and description for screen readers.',
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
