/**
 * Safety Page
 *
 * Monitor safety status, constraints, and mitigation controls.
 *
 * @module pages/Safety
 */

import { useMonitors, useMitigationState, useSafetyTimeline } from '@/hooks/useSafety';
import { Card } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Safety() {
  const { data: monitors, isLoading: monitorsLoading } = useMonitors();
  const { data: mitigationData, isLoading: mitigationLoading } = useMitigationState();
  const { data: timeline, isLoading: timelineLoading } = useSafetyTimeline({ limit: 100 });

  const stateColors: Record<string, string> = {
    nominal: 'bg-green-500',
    cautious: 'bg-yellow-500',
    fallback: 'bg-orange-500',
    safe_stop: 'bg-red-500',
    human_escalation: 'bg-purple-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Safety Monitor</h1>
          <p className="text-muted-foreground">
            Real-time safety status and constraint monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Configure Monitors</Button>
          <Button variant="outline">Export Log</Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Mitigation State</p>
          {mitigationLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${stateColors[mitigationData?.state || 'nominal']}`}
              />
              <span className="text-lg font-semibold capitalize">
                {mitigationData?.state || 'Unknown'}
              </span>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Monitors</p>
          <p className="mt-2 text-2xl font-bold">{monitors?.length || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Triggered Alerts</p>
          <p className="mt-2 text-2xl font-bold text-destructive">
            {monitors?.filter((m) => m.triggered).length || 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Max Severity</p>
          <p className="mt-2 text-2xl font-bold">
            {monitors
              ? Math.max(...monitors.map((m) => m.severity), 0).toFixed(2)
              : '0.00'}
          </p>
        </Card>
      </div>

      {/* Monitors List */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Safety Monitors</h2>
        {monitorsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : monitors?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No monitors configured
          </p>
        ) : (
          <div className="space-y-4">
            {monitors?.map((monitor) => (
              <div
                key={monitor.monitor_id}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  monitor.triggered ? 'border-destructive bg-destructive/5' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{monitor.monitor_id}</span>
                    <Badge variant={monitor.triggered ? 'destructive' : 'secondary'}>
                      {monitor.triggered ? 'Triggered' : 'Normal'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{monitor.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <p className="text-lg font-semibold">{monitor.severity.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Safety Timeline */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Safety Timeline</h2>
        {timelineLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : timeline?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No timeline data available
          </p>
        ) : (
          <div className="space-y-2">
            {timeline?.slice(0, 10).map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded border p-3"
              >
                <div
                  className={`h-2 w-2 rounded-full ${stateColors[entry.mitigation_state]}`}
                />
                <span className="text-sm capitalize">{entry.mitigation_state}</span>
                <span className="text-sm text-muted-foreground">
                  Severity: {entry.severity.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">
                  OOD: {entry.ood_score.toFixed(3)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
