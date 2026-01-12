/**
 * Dashboard Page
 *
 * Main dashboard with KPIs, charts, and system status overview.
 *
 * @module pages/Dashboard
 */

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Play, FolderKanban, Box, Shield } from 'lucide-react';
import { useUncertaintyEstimate, useUncertaintyLevel } from '@/hooks/useUncertainty';
import { useSafetyStatus } from '@/hooks/useSafety';
import { useAggregatedMetrics } from '@/hooks/useEvaluation';
import { KPICard } from '@/components/visualizations/kpi-card';
import { UncertaintyChart } from '@/components/visualizations/uncertainty-chart';
import { DateRangePicker, useDateRangeParams } from '@/components/common/DateRangePicker';
import { Card } from '@/components/common/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dateRange, setDateRange } = useDateRangeParams();

  // Fetch dashboard data
  const {
    data: uncertainty,
    isLoading: uncertaintyLoading,
    isFetching: uncertaintyFetching,
  } = useUncertaintyEstimate('default');
  const { level: uncertaintyLevel } = useUncertaintyLevel('default');
  const { mitigationState, status: safetyStatus, triggeredCount } = useSafetyStatus();
  const {
    data: metrics,
    isLoading: metricsLoading,
    isFetching: metricsFetching,
  } = useAggregatedMetrics();

  const isRefreshing = uncertaintyFetching || metricsFetching;

  // Refresh all dashboard data
  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries();
      toast.success('Dashboard refreshed', {
        description: 'All data has been updated.',
      });
    } catch (error) {
      toast.error('Refresh failed', {
        description: 'Unable to refresh dashboard data.',
      });
    }
  };

  // Quick action handlers
  const handleRunEvaluation = () => {
    toast.info('Starting evaluation...', {
      description: 'This may take a few moments.',
    });
    navigate('/scenarios');
  };

  const handleViewScenarios = () => {
    navigate('/scenarios');
  };

  const handleOpen3DViewer = () => {
    navigate('/viewer');
  };

  const handleConfigureMonitors = () => {
    navigate('/safety');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and key performance indicators
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-[260px]"
          />
          <Badge
            variant={safetyStatus === 'nominal' ? 'default' : 'destructive'}
            className="hidden sm:inline-flex"
          >
            {mitigationState || 'Unknown'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="refresh-button"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Confidence"
          value={uncertainty?.confidence ?? 0}
          format="percent"
          trend={uncertainty?.confidence && uncertainty.confidence > 0.8 ? 'up' : 'down'}
          description="Model confidence level"
          data-testid="kpi-card-confidence"
        />
        <KPICard
          title="Pass Rate"
          value={metrics?.pass_rate ?? 0}
          format="percent"
          description="Scenario evaluation pass rate"
          data-testid="kpi-card-pass-rate"
        />
        <KPICard
          title="Triggered Monitors"
          value={triggeredCount}
          format="number"
          status={triggeredCount > 0 ? 'warning' : 'success'}
          description="Active safety alerts"
          data-testid="kpi-card-monitors"
        />
        <KPICard
          title="Total Scenarios"
          value={metrics?.total_scenarios ?? 0}
          format="number"
          description="Evaluated scenarios"
          data-testid="kpi-card-scenarios"
        />
      </div>

      {/* Loading overlay for KPIs */}
      {(uncertaintyLoading || metricsLoading) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 -mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Uncertainty Chart */}
        <Card className="p-6" data-testid="uncertainty-chart">
          <h2 className="mb-4 text-lg font-semibold">Uncertainty Decomposition</h2>
          {uncertaintyLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : uncertainty ? (
            <UncertaintyChart
              data={uncertainty}
              type="bar"
              height={300}
              showConfidence
              warningThreshold={0.3}
              criticalThreshold={0.6}
            />
          ) : (
            <EmptyState
              title="No uncertainty data"
              description="Run an evaluation to see uncertainty metrics"
            />
          )}
        </Card>

        {/* System Status */}
        <Card className="p-6" data-testid="system-status">
          <h2 className="mb-4 text-lg font-semibold">System Status</h2>
          <div className="space-y-4">
            <StatusItem
              label="Mitigation State"
              value={mitigationState || 'Unknown'}
              status={getStateStatus(mitigationState)}
            />
            <StatusItem
              label="Uncertainty Level"
              value={uncertaintyLevel}
              status={getLevelStatus(uncertaintyLevel)}
            />
            <StatusItem
              label="Safety Status"
              value={safetyStatus}
              status={safetyStatus === 'nominal' ? 'success' : 'warning'}
            />
            <StatusItem
              label="OOD Detection"
              value="In-distribution"
              status="success"
            />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6" data-testid="quick-actions">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleRunEvaluation}>
            <Play className="mr-2 h-4 w-4" />
            Run Evaluation
          </Button>
          <Button variant="outline" onClick={handleViewScenarios}>
            <FolderKanban className="mr-2 h-4 w-4" />
            View Scenarios
          </Button>
          <Button variant="outline" onClick={handleOpen3DViewer}>
            <Box className="mr-2 h-4 w-4" />
            Open 3D Viewer
          </Button>
          <Button variant="outline" onClick={handleConfigureMonitors}>
            <Shield className="mr-2 h-4 w-4" />
            Configure Monitors
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'neutral';
}) {
  const statusColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    neutral: 'bg-gray-400',
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', statusColors[status])} />
        <span className="text-sm font-medium capitalize">{value}</span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center text-center">
      <div className="w-12 h-12 mb-4 rounded-full bg-muted flex items-center justify-center">
        <Box className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function getStateStatus(state: string | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch (state) {
    case 'nominal':
      return 'success';
    case 'cautious':
      return 'warning';
    case 'fallback':
    case 'safe_stop':
    case 'human_escalation':
      return 'error';
    default:
      return 'neutral';
  }
}

function getLevelStatus(level: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (level) {
    case 'nominal':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'neutral';
  }
}
