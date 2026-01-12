/**
 * SafetyTimelineChart Component Stories
 *
 * Comprehensive Storybook stories for the SafetyTimelineChart component demonstrating
 * safety margin monitoring, mitigation states, and real-time visualization.
 *
 * @module components/visualizations/SafetyTimelineChart.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { SafetyTimelineChart } from './safety-timeline-chart';
import type { SafetyMarginTimeline, MitigationState } from '@/types/api';
import * as React from 'react';

// ============================================================================
// Sample Data Generator
// ============================================================================

const generateSafetyData = (
  count: number,
  options: {
    baseMargin?: number;
    variance?: number;
    degradation?: number;
    startState?: MitigationState;
  } = {}
): SafetyMarginTimeline[] => {
  const {
    baseMargin = 0.5,
    variance = 0.2,
    degradation = 0,
    startState = 'nominal',
  } = options;

  const now = Date.now();
  const intervalMs = 60000; // 1 minute intervals

  const states: MitigationState[] = ['nominal', 'cautious', 'fallback', 'safe_stop', 'human_escalation'];
  let currentStateIndex = states.indexOf(startState);

  return Array.from({ length: count }, (_, i) => {
    // Calculate margin with optional degradation
    const timeProgress = i / count;
    const margin = baseMargin - degradation * timeProgress + (Math.random() - 0.5) * variance;

    // Calculate OOD score
    const oodScore = Math.max(0, Math.min(1, 0.2 + Math.random() * 0.3 + degradation * timeProgress));

    // Determine mitigation state based on margin
    if (margin < 0) {
      currentStateIndex = Math.min(4, currentStateIndex + 1);
    } else if (margin > 0.3 && currentStateIndex > 0) {
      currentStateIndex = Math.max(0, currentStateIndex - 1);
    }

    return {
      timestamp: now - (count - i - 1) * intervalMs,
      constraint_margins: {
        velocity: margin + (Math.random() - 0.5) * 0.1,
        proximity: margin * 0.8 + (Math.random() - 0.5) * 0.1,
        force: margin * 1.2 + (Math.random() - 0.5) * 0.1,
      },
      ood_score: oodScore,
      severity: Math.max(0, -margin * 2 + Math.random() * 0.2),
      mitigation_state: states[currentStateIndex],
    };
  });
};

// ============================================================================
// Sample Data
// ============================================================================

const nominalData = generateSafetyData(100, {
  baseMargin: 0.6,
  variance: 0.15,
  degradation: 0,
  startState: 'nominal',
});

const degradingData = generateSafetyData(100, {
  baseMargin: 0.5,
  variance: 0.1,
  degradation: 0.6,
  startState: 'nominal',
});

const criticalData = generateSafetyData(100, {
  baseMargin: 0.1,
  variance: 0.2,
  degradation: 0.3,
  startState: 'cautious',
});

const recoveryData = (() => {
  // Simulate recovery from critical state
  const data: SafetyMarginTimeline[] = [];
  const now = Date.now();
  const states: MitigationState[] = ['safe_stop', 'fallback', 'cautious', 'nominal'];

  for (let i = 0; i < 100; i++) {
    const progress = i / 100;
    const stateIndex = Math.min(3, Math.floor(progress * 4));
    const margin = -0.2 + progress * 0.8 + (Math.random() - 0.5) * 0.1;

    data.push({
      timestamp: now - (100 - i - 1) * 60000,
      constraint_margins: {
        velocity: margin,
        proximity: margin * 0.9,
        force: margin * 1.1,
      },
      ood_score: 0.6 - progress * 0.4,
      severity: Math.max(0, 0.8 - progress * 0.9),
      mitigation_state: states[stateIndex],
    });
  }
  return data;
})();

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof SafetyTimelineChart> = {
  title: 'Components/Visualizations/SafetyTimelineChart',
  component: SafetyTimelineChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Multi-line time series chart for monitoring safety margins in real-time.
Critical for autonomous systems safety monitoring.

## Features
- Multiple constraint margin lines
- Mitigation state background bands (color-coded)
- Safety threshold line with annotations
- OOD (Out-of-Distribution) score line (right axis)
- Severity area visualization
- Interactive tooltip with detailed information
- Real-time update support
- Legend for constraints and states

## Mitigation States

- **Nominal**: Normal operation, all constraints satisfied
- **Cautious**: Minor concerns, operating with extra caution
- **Fallback**: Reduced capability mode
- **Safe Stop**: System stopped safely
- **Human Escalation**: Requires human intervention

## Usage

\`\`\`tsx
import { SafetyTimelineChart } from '@/components/visualizations/safety-timeline-chart';

<SafetyTimelineChart
  data={safetyTimeline}
  height={400}
  constraints={['velocity', 'proximity', 'force']}
  showOODScore
  showSeverity
  realtime
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
      description: 'Safety margin timeline data array',
      control: false,
      table: {
        type: { summary: 'SafetyMarginTimeline[]' },
      },
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'number', min: 300, max: 800 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '400' },
      },
    },
    constraints: {
      description: 'Specific constraints to display (default: all)',
      control: false,
      table: {
        type: { summary: 'string[]' },
      },
    },
    showOODScore: {
      description: 'Show OOD score line on right axis',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    showSeverity: {
      description: 'Show severity area visualization',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    realtime: {
      description: 'Enable real-time update mode',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    stateColors: {
      description: 'Custom colors for mitigation states',
      control: false,
      table: {
        type: { summary: 'Record<MitigationState, string>' },
      },
    },
    timeRange: {
      description: 'Custom time range for x-axis',
      control: false,
      table: {
        type: { summary: '[Date, Date]' },
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
  },
  args: {
    height: 450,
    showOODScore: true,
    showSeverity: true,
    animated: true,
  },
};

export default meta;
type Story = StoryObj<typeof SafetyTimelineChart>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * Default safety timeline showing nominal operation.
 */
export const Default: Story = {
  args: {
    data: nominalData,
    title: 'Safety Margin Timeline',
    description: 'Real-time monitoring of constraint margins and system state',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing safety margins during nominal operation with stable constraint values.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify chart is rendered
    const svg = canvasElement.querySelector('svg');
    await expect(svg).toBeInTheDocument();
  },
};

// ============================================================================
// Degrading Safety Story
// ============================================================================

/**
 * Shows safety margins degrading over time.
 */
export const DegradingSafety: Story = {
  args: {
    data: degradingData,
    title: 'Safety Degradation Timeline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates safety margins degrading over time, crossing thresholds and triggering mitigation state changes.',
      },
    },
  },
};

// ============================================================================
// Critical Situation Story
// ============================================================================

/**
 * Shows a critical safety situation with low margins.
 */
export const CriticalSituation: Story = {
  args: {
    data: criticalData,
    title: 'Critical Safety Situation',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a critical situation with negative safety margins and active mitigation states.',
      },
    },
  },
};

// ============================================================================
// Recovery Scenario Story
// ============================================================================

/**
 * Shows system recovering from a critical state.
 */
export const RecoveryScenario: Story = {
  args: {
    data: recoveryData,
    title: 'System Recovery Timeline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates system recovery from safe_stop back to nominal operation as safety margins improve.',
      },
    },
  },
};

// ============================================================================
// Real-time Simulation Story
// ============================================================================

/**
 * Simulated real-time safety monitoring.
 */
export const RealtimeSimulation: Story = {
  render: function RealtimeRender() {
    const [data, setData] = React.useState<SafetyMarginTimeline[]>(
      generateSafetyData(50, { baseMargin: 0.4, variance: 0.15 })
    );
    const [isPaused, setIsPaused] = React.useState(false);

    React.useEffect(() => {
      if (isPaused) return;

      const interval = setInterval(() => {
        setData((prevData) => {
          const lastPoint = prevData[prevData.length - 1];
          const states: MitigationState[] = ['nominal', 'cautious', 'fallback', 'safe_stop', 'human_escalation'];

          // Generate new point based on last values with some continuity
          const velocityMargin = lastPoint.constraint_margins.velocity + (Math.random() - 0.5) * 0.1;
          const proximityMargin = lastPoint.constraint_margins.proximity + (Math.random() - 0.5) * 0.1;
          const forceMargin = lastPoint.constraint_margins.force + (Math.random() - 0.5) * 0.1;
          const avgMargin = (velocityMargin + proximityMargin + forceMargin) / 3;

          // Determine state based on average margin
          let stateIndex = states.indexOf(lastPoint.mitigation_state);
          if (avgMargin < 0 && stateIndex < 4) {
            stateIndex = Math.min(4, stateIndex + 1);
          } else if (avgMargin > 0.3 && stateIndex > 0) {
            stateIndex = Math.max(0, stateIndex - 1);
          }

          const newPoint: SafetyMarginTimeline = {
            timestamp: Date.now(),
            constraint_margins: {
              velocity: velocityMargin,
              proximity: proximityMargin,
              force: forceMargin,
            },
            ood_score: Math.max(0, Math.min(1, lastPoint.ood_score + (Math.random() - 0.5) * 0.1)),
            severity: Math.max(0, -avgMargin * 2),
            mitigation_state: states[stateIndex],
          };

          return [...prevData.slice(-49), newPoint];
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [isPaused]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isPaused && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm text-muted-foreground">Live safety monitoring</span>
              </>
            )}
            {isPaused && (
              <span className="text-sm text-yellow-600">Monitoring paused</span>
            )}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded text-sm ${isPaused ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <SafetyTimelineChart
          data={data}
          height={450}
          showOODScore
          showSeverity
          realtime={!isPaused}
          title="Real-time Safety Monitoring"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates real-time safety monitoring with live data updates every second. Use pause/resume to control.',
      },
    },
  },
};

// ============================================================================
// Specific Constraints Story
// ============================================================================

/**
 * Showing only specific constraints.
 */
export const SpecificConstraints: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Velocity Constraint Only</h3>
        <SafetyTimelineChart
          data={nominalData}
          height={250}
          constraints={['velocity']}
          showOODScore={false}
          showSeverity={false}
        />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Velocity & Proximity</h3>
        <SafetyTimelineChart
          data={nominalData}
          height={250}
          constraints={['velocity', 'proximity']}
          showOODScore
          showSeverity={false}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how to display specific constraints instead of all available ones.',
      },
    },
  },
};

// ============================================================================
// Without OOD Score Story
// ============================================================================

/**
 * Chart without OOD score display.
 */
export const WithoutOODScore: Story = {
  args: {
    data: nominalData,
    showOODScore: false,
    showSeverity: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Safety timeline without the OOD score line for simpler visualization.',
      },
    },
  },
};

// ============================================================================
// Without Severity Story
// ============================================================================

/**
 * Chart without severity area.
 */
export const WithoutSeverity: Story = {
  args: {
    data: criticalData,
    showOODScore: true,
    showSeverity: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Safety timeline without the severity area visualization.',
      },
    },
  },
};

// ============================================================================
// Minimal View Story
// ============================================================================

/**
 * Minimal chart showing only constraint margins.
 */
export const MinimalView: Story = {
  args: {
    data: nominalData,
    showOODScore: false,
    showSeverity: false,
    height: 300,
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal view showing only the constraint margin lines and state bands.',
      },
    },
  },
};

// ============================================================================
// Custom State Colors Story
// ============================================================================

/**
 * Chart with custom mitigation state colors.
 */
export const CustomStateColors: Story = {
  args: {
    data: degradingData,
    stateColors: {
      nominal: '#22c55e', // green
      cautious: '#eab308', // yellow
      fallback: '#f97316', // orange
      safe_stop: '#ef4444', // red
      human_escalation: '#7c3aed', // purple
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom color configuration for mitigation states.',
      },
    },
  },
};

// ============================================================================
// All Mitigation States Story
// ============================================================================

/**
 * Demonstration of all mitigation states.
 */
export const AllMitigationStates: Story = {
  render: () => {
    // Generate data that cycles through all states
    const now = Date.now();
    const states: MitigationState[] = ['nominal', 'cautious', 'fallback', 'safe_stop', 'human_escalation'];
    const allStatesData: SafetyMarginTimeline[] = [];

    states.forEach((state, stateIndex) => {
      for (let i = 0; i < 20; i++) {
        const margin = 0.5 - stateIndex * 0.2 + (Math.random() - 0.5) * 0.1;
        allStatesData.push({
          timestamp: now - (100 - stateIndex * 20 - i - 1) * 60000,
          constraint_margins: {
            velocity: margin,
            proximity: margin * 0.9,
            force: margin * 1.1,
          },
          ood_score: 0.2 + stateIndex * 0.15,
          severity: Math.max(0, stateIndex * 0.2),
          mitigation_state: state,
        });
      }
    });

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This chart shows all five mitigation states in sequence for demonstration purposes.
        </div>
        <SafetyTimelineChart
          data={allStatesData}
          height={450}
          showOODScore
          showSeverity
          title="All Mitigation States Demo"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all five mitigation states: nominal, cautious, fallback, safe_stop, and human_escalation.',
      },
    },
  },
};

// ============================================================================
// Dashboard Integration Story
// ============================================================================

/**
 * Safety timeline in a dashboard context.
 */
export const DashboardIntegration: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Safety Monitoring Dashboard</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>System Status: Nominal</span>
          </div>
          <div className="text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">0.45</div>
          <div className="text-sm text-muted-foreground">Avg. Safety Margin</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">0.28</div>
          <div className="text-sm text-muted-foreground">OOD Score</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">0</div>
          <div className="text-sm text-muted-foreground">Violations Today</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">99.2%</div>
          <div className="text-sm text-muted-foreground">Uptime</div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Constraint Margins (Last Hour)</h3>
        <SafetyTimelineChart
          data={nominalData}
          height={350}
          showOODScore
          showSeverity
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the safety timeline integrates into a larger monitoring dashboard with KPI cards.',
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
    data: nominalData.slice(0, 30),
    title: 'Safety Margin Timeline',
    description: 'Time series chart showing constraint margins for velocity, proximity, and force constraints over the last 30 minutes. All margins are positive indicating safe operation.',
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper accessibility with descriptive title and summary for screen readers.',
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
// Loading State Story
// ============================================================================

/**
 * Chart in loading state.
 */
export const Loading: Story = {
  args: {
    data: [],
    height: 400,
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading skeleton while safety data is being fetched.',
      },
    },
  },
};

// ============================================================================
// Empty State Story
// ============================================================================

/**
 * Chart with no data.
 */
export const EmptyState: Story = {
  args: {
    data: [],
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the empty state when no safety data is available.',
      },
    },
  },
};
