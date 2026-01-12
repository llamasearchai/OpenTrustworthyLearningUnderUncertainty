/**
 * Evaluation API Handlers
 *
 * MSW handlers for scenario evaluation endpoints.
 *
 * @module tests/mocks/handlers/evaluation-handlers
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createScenario,
  createEvaluationResult,
  createMany,
} from '../factories';
import { PRESET_SCENARIOS } from '../presets';

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
 * Creates GET /api/scenarios handler with customizable options.
 */
export function createScenariosHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/scenarios`, async ({ request }) => {
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
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '10');
    const tags = url.searchParams.get('tags');
    const search = url.searchParams.get('search');

    let total = 100;

    // Simulate filtering
    if (tags || search) {
      total = Math.floor(total * 0.3);
    }

    const items = createMany(createScenario, Math.min(pageSize, total - (page - 1) * pageSize));

    // Inject presets at the beginning of the list for visibility
    if (page === 1 && !tags && !search) {
      items.unshift(...PRESET_SCENARIOS);
      // Trim to pageSize if needed, though usually we want to see them
      if (items.length > pageSize) {
        items.length = pageSize;
      }
    }

    return HttpResponse.json({
      items,
      total,
      page,
      page_size: pageSize,
      has_more: page * pageSize < total,
      filters: {
        tags: tags?.split(',') ?? [],
        search: search ?? null,
      },
    });
  });
}

/**
 * Creates GET /api/scenarios/:id handler.
 */
export function createScenarioByIdHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/scenarios/:id`, async ({ params }) => {
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

    // Simulate 404 for specific IDs
    if (id === 'not-found' || id === '00000000-0000-0000-0000-000000000000') {
      return HttpResponse.json(
        {
          code: 'NOT_FOUND',
          message: `Scenario with ID ${id} not found`,
        },
        { status: 404 }
      );
    }



    // Check for preset ID
    const preset = PRESET_SCENARIOS.find(s => s.id === id);
    if (preset) {
      return HttpResponse.json(preset);
    }

    return HttpResponse.json(createScenario({ id: id as string }));
  });
}

/**
 * Creates POST /api/scenarios handler.
 */
export function createCreateScenarioHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/scenarios`, async ({ request }) => {
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

    const body = await request.json() as Record<string, unknown>;

    // Validation
    if (!body.tags) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: tags',
          details: { field: 'tags' },
        },
        { status: 422 }
      );
    }

    return HttpResponse.json(createScenario(body), { status: 201 });
  });
}

/**
 * Creates PUT /api/scenarios/:id handler.
 */
export function createUpdateScenarioHandler(options: HandlerOptions = {}) {
  return http.put(`${API_BASE}/scenarios/:id`, async ({ params, request }) => {
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
    const body = await request.json() as Record<string, unknown>;

    return HttpResponse.json(createScenario({ ...body, id: id as string }));
  });
}

/**
 * Creates DELETE /api/scenarios/:id handler.
 */
export function createDeleteScenarioHandler(options: HandlerOptions = {}) {
  return http.delete(`${API_BASE}/scenarios/:id`, async ({ params }) => {
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

    return HttpResponse.json({ success: true, deleted_id: params.id });
  });
}

/**
 * Creates POST /api/evaluate handler.
 */
export function createEvaluateHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/evaluate`, async ({ request }) => {
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

    const body = await request.json() as { scenario_id?: string; scenario_ids?: string[] };

    if (body.scenario_ids) {
      // Batch evaluation
      const results = body.scenario_ids.map((id) =>
        createEvaluationResult({ scenario_id: id })
      );

      return HttpResponse.json({
        results,
        summary: {
          total: results.length,
          passed: results.filter((r) => r.passed).length,
          failed: results.filter((r) => !r.passed).length,
          pass_rate: results.filter((r) => r.passed).length / results.length,
        },
      });
    }

    // Single evaluation
    return HttpResponse.json(
      createEvaluationResult({ scenario_id: body.scenario_id })
    );
  });
}

/**
 * Creates GET /api/evaluation/results handler.
 */
export function createEvaluationResultsHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/evaluation/results`, async ({ request }) => {
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
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '10');
    const passed = url.searchParams.get('passed');

    let items = createMany(createEvaluationResult, pageSize);

    // Filter by passed status
    if (passed !== null) {
      const passedBool = passed === 'true';
      items = items.map((item) => ({ ...item, passed: passedBool }));
    }

    return HttpResponse.json({
      items,
      total: 100,
      page,
      page_size: pageSize,
      has_more: page * pageSize < 100,
    });
  });
}

/**
 * Creates POST /api/evaluation/aggregate handler.
 */
export function createAggregateHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/evaluation/aggregate`, async ({ request }) => {
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

    const body = await request.json() as { group_by?: string[] };

    return HttpResponse.json({
      total_scenarios: 100,
      pass_rate: 0.85,
      mean_metrics: {
        accuracy: 0.92,
        f1_score: 0.88,
        safety_rate: 0.97,
        latency_ms: 45.3,
      },
      std_metrics: {
        accuracy: 0.05,
        f1_score: 0.08,
        safety_rate: 0.02,
        latency_ms: 12.1,
      },
      groups: body.group_by ? generateGroupedResults(body.group_by) : undefined,
    });
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateGroupedResults(groupBy: string[]): Record<string, unknown>[] {
  const groups: Record<string, unknown>[] = [];

  if (groupBy.includes('environment')) {
    ['urban', 'highway', 'rural'].forEach((env) => {
      groups.push({
        group: { environment: env },
        count: Math.floor(Math.random() * 50) + 10,
        pass_rate: 0.8 + Math.random() * 0.2,
        mean_metrics: {
          accuracy: 0.85 + Math.random() * 0.1,
          f1_score: 0.8 + Math.random() * 0.15,
        },
      });
    });
  }

  if (groupBy.includes('weather')) {
    ['clear', 'rain', 'fog', 'snow'].forEach((weather) => {
      groups.push({
        group: { weather },
        count: Math.floor(Math.random() * 30) + 5,
        pass_rate: weather === 'clear' ? 0.95 : 0.7 + Math.random() * 0.2,
        mean_metrics: {
          accuracy: weather === 'clear' ? 0.95 : 0.75 + Math.random() * 0.15,
          f1_score: weather === 'clear' ? 0.92 : 0.7 + Math.random() * 0.2,
        },
      });
    });
  }

  return groups;
}

// ============================================================================
// Default Handlers
// ============================================================================

export const evaluationHandlers = [
  http.get(`${API_BASE}/scenarios`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '10');

    const items = createMany(createScenario, pageSize);
    return HttpResponse.json({
      items,
      total: 100,
      page,
      page_size: pageSize,
      has_more: page * pageSize < 100,
    });
  }),

  http.get(`${API_BASE}/scenarios/:id`, async ({ params }) => {
    await delay(100);
    return HttpResponse.json(createScenario({ id: params.id as string }));
  }),

  http.post(`${API_BASE}/scenarios`, async ({ request }) => {
    await delay(200);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(createScenario(body), { status: 201 });
  }),

  http.put(`${API_BASE}/scenarios/:id`, async ({ params, request }) => {
    await delay(150);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(createScenario({ ...body, id: params.id as string }));
  }),

  http.delete(`${API_BASE}/scenarios/:id`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/evaluate`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as { scenario_id: string };
    return HttpResponse.json(createEvaluationResult({ scenario_id: body.scenario_id }));
  }),

  http.get(`${API_BASE}/evaluation/results`, async () => {
    await delay(100);
    return HttpResponse.json({
      items: createMany(createEvaluationResult, 10),
      total: 10,
      page: 1,
      page_size: 10,
      has_more: false,
    });
  }),

  http.post(`${API_BASE}/evaluation/aggregate`, async () => {
    await delay(200);
    return HttpResponse.json({
      total_scenarios: 100,
      pass_rate: 0.85,
      mean_metrics: {
        accuracy: 0.92,
        f1_score: 0.88,
        safety_rate: 0.97,
      },
    });
  }),
];

export default evaluationHandlers;
