/**
 * Safety API Handlers
 *
 * MSW handlers for safety monitoring and mitigation endpoints.
 *
 * @module tests/mocks/handlers/safety-handlers
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createMonitorOutput,
  createFilteredAction,
  createSafetyMarginTimeline,
  createMitigationState,
  createMany,
} from '../factories';
import { PRESET_MONITORS, PRESET_TIMELINE } from '../presets';

const API_BASE = '/api';

// ============================================================================
// Types
// ============================================================================

export interface HandlerOptions {
  /** Response delay in ms */
  delay?: number;
  /** Force an error response */
  error?: {
    status: number;
    message: string;
    code?: string;
  };
}

// ============================================================================
// Factory Functions for Handlers
// ============================================================================

/**
 * Creates GET /api/monitors handler.
 */
export function createMonitorsHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/monitors`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const monitors = [
      ...PRESET_MONITORS,
      createMonitorOutput({
        monitor_id: 'random-monitor-1',
        triggered: false,
        severity: 0,
        message: 'Random check passed',
      }),
    ];

    return HttpResponse.json(monitors);
  });
}

/**
 * Creates GET /api/monitors/:id handler.
 */
export function createMonitorByIdHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/monitors/:id`, async ({ params }) => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const { id } = params;

    // Simulate 404 for unknown monitors
    const knownMonitors = ['ttc-monitor', 'ood-monitor', 'constraint-monitor', 'uncertainty-monitor', 'performance-monitor'];
    if (!knownMonitors.includes(id as string)) {
      return HttpResponse.json(
        {
          code: 'NOT_FOUND',
          message: `Monitor with ID ${id} not found`,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(createMonitorOutput({ monitor_id: id as string }));
  });
}

/**
 * Creates GET /api/monitors/:id/history handler.
 */
export function createMonitorHistoryHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/monitors/:id/history`, async ({ params, request }) => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '100');

    const history = Array.from({ length: limit }, (_, i) =>
      createMonitorOutput({
        monitor_id: params.id as string,
        timestamp: Date.now() - i * 1000,
      })
    );

    return HttpResponse.json({
      monitor_id: params.id,
      history,
      total: limit,
    });
  });
}

/**
 * Creates GET /api/mitigation/state handler.
 */
export function createMitigationStateHandler(options: HandlerOptions & { state?: string } = {}) {
  return http.get(`${API_BASE}/mitigation/state`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    return HttpResponse.json({
      state: options.state ?? 'nominal',
      since: Date.now() - Math.floor(Math.random() * 60000),
      transitions: Math.floor(Math.random() * 5),
      last_escalation: null,
    });
  });
}

/**
 * Creates POST /api/mitigation/state handler.
 */
export function createSetMitigationStateHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/mitigation/state`, async ({ request }) => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const body = await request.json() as { state: string; reason?: string };

    return HttpResponse.json({
      previous_state: 'nominal',
      current_state: body.state,
      transition_time: Date.now(),
      reason: body.reason ?? 'Manual override',
    });
  });
}

/**
 * Creates POST /api/safety/filter handler.
 */
export function createSafetyFilterHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/safety/filter`, async ({ request }) => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const body = await request.json() as { action: number[]; state?: unknown };

    // Simulate action filtering
    const proposedAction = body.action ?? [0, 0];
    const wasModified = Math.random() > 0.7;

    return HttpResponse.json(
      createFilteredAction({
        action: wasModified
          ? proposedAction.map((a) => a * 0.8)
          : proposedAction,
        was_modified: wasModified,
        fallback_used: wasModified && Math.random() > 0.5,
      })
    );
  });
}

/**
 * Creates GET /api/safety/timeline handler.
 */
export function createSafetyTimelineHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/safety/timeline`, async ({ request }) => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '100');
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');

    const timeline = createMany(createSafetyMarginTimeline, limit).map((item, i) => ({
      ...item,
      timestamp: Date.now() - i * 1000,
    }));

    // Use preset timeline if limit matches or just return mixed
    // For specific demo consistency, let's mix in the preset
    if (PRESET_TIMELINE.length > 0) {
        return HttpResponse.json(PRESET_TIMELINE);
    }

    return HttpResponse.json(timeline);
  });
}

/**
 * Creates GET /api/safety/constraints handler.
 */
export function createConstraintsHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/safety/constraints`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    return HttpResponse.json({
      hard_constraints: [
        { id: 'speed_limit', name: 'Speed Limit', threshold: 30, unit: 'm/s' },
        { id: 'collision_margin', name: 'Collision Margin', threshold: 2, unit: 'm' },
        { id: 'lane_boundary', name: 'Lane Boundary', threshold: 0.5, unit: 'm' },
      ],
      soft_constraints: [
        { id: 'acceleration', name: 'Acceleration', threshold: 4, unit: 'm/s2' },
        { id: 'jerk', name: 'Jerk', threshold: 10, unit: 'm/s3' },
        { id: 'lateral_acceleration', name: 'Lateral Acceleration', threshold: 3, unit: 'm/s2' },
      ],
      violation_threshold: 0.01,
    });
  });
}

/**
 * Creates GET /api/safety/envelope handler.
 */
export function createEnvelopeHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/safety/envelope`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }

    if (options.error) {
      return HttpResponse.json(
        {
          code: options.error.code ?? 'ERROR',
          message: options.error.message,
        },
        { status: options.error.status }
      );
    }

    return HttpResponse.json({
      current_margins: {
        speed_limit: 5.2,
        collision_margin: 8.4,
        lane_boundary: 1.2,
        acceleration: 2.1,
      },
      is_safe: true,
      active_constraints: [],
      time_to_violation: null,
    });
  });
}

// ============================================================================
// Default Handlers
// ============================================================================

export const safetyHandlers = [
  http.get(`${API_BASE}/monitors`, async () => {
    await delay(100);
    return HttpResponse.json(createMany(createMonitorOutput, 5));
  }),

  http.get(`${API_BASE}/monitors/:id`, async ({ params }) => {
    await delay(100);
    return HttpResponse.json(createMonitorOutput({ monitor_id: params.id as string }));
  }),

  http.get(`${API_BASE}/monitors/:id/history`, async ({ params }) => {
    await delay(100);
    return HttpResponse.json({
      monitor_id: params.id,
      history: createMany(() => createMonitorOutput({ monitor_id: params.id as string }), 50),
    });
  }),

  http.get(`${API_BASE}/mitigation/state`, async () => {
    await delay(50);
    return HttpResponse.json({
      state: 'nominal',
      since: Date.now() - 60000,
      transitions: 0,
    });
  }),

  http.post(`${API_BASE}/mitigation/state`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as { state: string };
    return HttpResponse.json({
      previous_state: 'nominal',
      current_state: body.state,
      transition_time: Date.now(),
    });
  }),

  http.post(`${API_BASE}/safety/filter`, async () => {
    await delay(100);
    return HttpResponse.json(createFilteredAction());
  }),

  http.get(`${API_BASE}/safety/timeline`, async () => {
    await delay(100);
    return HttpResponse.json(createMany(createSafetyMarginTimeline, 100));
  }),

  http.get(`${API_BASE}/safety/constraints`, async () => {
    await delay(50);
    return HttpResponse.json({
      hard_constraints: [
        { id: 'speed_limit', name: 'Speed Limit', threshold: 30 },
        { id: 'collision_margin', name: 'Collision Margin', threshold: 2 },
      ],
      soft_constraints: [
        { id: 'acceleration', name: 'Acceleration', threshold: 4 },
      ],
      violation_threshold: 0.01,
    });
  }),

  http.get(`${API_BASE}/safety/envelope`, async () => {
    await delay(50);
    return HttpResponse.json({
      current_margins: {
        speed_limit: 5.2,
        collision_margin: 8.4,
      },
      is_safe: true,
      active_constraints: [],
    });
  }),
];

export default safetyHandlers;
