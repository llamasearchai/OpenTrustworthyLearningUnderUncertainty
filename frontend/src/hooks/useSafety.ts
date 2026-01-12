/**
 * Safety Monitoring Hooks
 *
 * TanStack Query hooks for safety monitors, mitigation state, and filtering.
 *
 * @module hooks/useSafety
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { api, wsClient } from '@/lib/api/client';
import { safetyKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/client';
import type {
  MonitorOutput,
  MitigationState,
  SafetyEnvelope,
  FilteredAction,
  SafetyMarginTimeline,
} from '@/types/api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all active monitors
 */
export function useMonitors(options?: { enabled?: boolean }) {
  return useQuery<MonitorOutput[], Error>({
    queryKey: safetyKeys.monitors(),
    queryFn: () => api.safety.getMonitors(),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled,
  });
}

/**
 * Fetch a specific monitor output
 */
export function useMonitorOutput(id: string, options?: { enabled?: boolean }) {
  return useQuery<MonitorOutput, Error>({
    queryKey: safetyKeys.monitor(id),
    queryFn: () => api.safety.getMonitor(id),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Fetch current mitigation state
 */
export function useMitigationState(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<{ state: MitigationState }, Error>({
    queryKey: safetyKeys.mitigationState(),
    queryFn: () => api.safety.getMitigationState(),
    staleTime: STALE_TIMES.realtime,
    refetchInterval: options?.refetchInterval ?? 1000, // Poll frequently for safety
    enabled: options?.enabled,
  });
}

/**
 * Fetch safety margin timeline
 */
export function useSafetyTimeline(
  params?: {
    start?: number;
    end?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery<SafetyMarginTimeline[], Error>({
    queryKey: safetyKeys.timeline(params),
    queryFn: () => api.safety.getTimeline(params),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Filter an action through the safety system
 */
export function useFilterAction() {
  return useMutation({
    mutationFn: ({
      action,
      envelope,
    }: {
      action: number[];
      envelope?: SafetyEnvelope;
    }) => api.safety.filterAction(action, envelope),
  });
}

// ============================================================================
// Real-time Hooks
// ============================================================================

/**
 * Subscribe to monitor alerts via WebSocket
 */
export function useMonitorAlerts(
  onAlert: (output: MonitorOutput) => void,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enabled === false) return;

    const unsubscribe = wsClient.subscribe<MonitorOutput>(
      'monitor_alert',
      (message) => {
        onAlert(message.payload);
        // Update cache with new monitor output
        queryClient.setQueryData<MonitorOutput[]>(
          safetyKeys.monitors(),
          (old) => {
            if (!old) return [message.payload];
            const index = old.findIndex(
              (m) => m.monitor_id === message.payload.monitor_id
            );
            if (index >= 0) {
              const updated = [...old];
              updated[index] = message.payload;
              return updated;
            }
            return [...old, message.payload];
          }
        );
      }
    );

    return unsubscribe;
  }, [onAlert, queryClient, options?.enabled]);
}

/**
 * Subscribe to mitigation state changes via WebSocket
 */
export function useMitigationStateSubscription(
  onStateChange: (state: MitigationState) => void,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enabled === false) return;

    const unsubscribe = wsClient.subscribe<{ state: MitigationState }>(
      'state_change',
      (message) => {
        onStateChange(message.payload.state);
        // Update cache
        queryClient.setQueryData(
          safetyKeys.mitigationState(),
          message.payload
        );
      }
    );

    return unsubscribe;
  }, [onStateChange, queryClient, options?.enabled]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get triggered monitors only
 */
export function useTriggeredMonitors() {
  const { data: monitors, ...rest } = useMonitors();

  const triggeredMonitors = monitors?.filter((m) => m.triggered) ?? [];

  return {
    ...rest,
    data: triggeredMonitors,
    hasTriggeredMonitors: triggeredMonitors.length > 0,
    highestSeverity: Math.max(...triggeredMonitors.map((m) => m.severity), 0),
  };
}

/**
 * Get safety status summary
 */
export function useSafetyStatus() {
  const { data: mitigationData, isLoading: mitigationLoading } =
    useMitigationState();
  const { data: monitors, isLoading: monitorsLoading } = useMonitors();

  const triggeredCount = monitors?.filter((m) => m.triggered).length ?? 0;
  const maxSeverity = Math.max(...(monitors?.map((m) => m.severity) ?? []), 0);

  const status = (() => {
    const state = mitigationData?.state;
    if (!state) return 'unknown';
    if (state === 'safe_stop' || state === 'human_escalation') return 'critical';
    if (state === 'fallback') return 'warning';
    if (state === 'cautious') return 'caution';
    return 'nominal';
  })();

  return {
    isLoading: mitigationLoading || monitorsLoading,
    mitigationState: mitigationData?.state ?? null,
    triggeredCount,
    maxSeverity,
    status,
    isNominal: status === 'nominal',
    needsAttention: status !== 'nominal' && status !== 'unknown',
  };
}

/**
 * Check if an action would be modified by safety filters
 */
export function useActionSafetyCheck() {
  const { mutateAsync: filterAction, isPending } = useFilterAction();

  const checkAction = useCallback(
    async (action: number[], envelope?: SafetyEnvelope) => {
      const result = await filterAction({ action, envelope });
      return {
        isSafe: !result.was_modified,
        wouldBeModified: result.was_modified,
        constraintMargins: result.constraint_margins,
        violationType: result.violation_type,
      };
    },
    [filterAction]
  );

  return {
    checkAction,
    isChecking: isPending,
  };
}
