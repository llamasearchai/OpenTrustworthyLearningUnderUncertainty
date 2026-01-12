/**
 * Active Learning API Handlers
 *
 * MSW handlers for active learning and acquisition endpoints.
 *
 * @module tests/mocks/handlers/active-learning-handlers
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createSampleMetadata,
  createAcquisitionConfig,
  createBatchSelectionResult,
  createOODResult,
  createMany,
} from '../factories';
import { PRESET_SAMPLES } from '../presets';

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
 * Creates GET /api/samples handler.
 */
export function createSamplesHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/samples`, async ({ request }) => {
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
    const sortBy = url.searchParams.get('sort_by') ?? 'uncertainty';
    const sortOrder = url.searchParams.get('sort_order') ?? 'desc';
    const labeled = url.searchParams.get('labeled');

    const total = 1000;
    const items = createMany(createSampleMetadata, pageSize);

    // Inject presets on first page
    if (page === 1) {
      items.splice(0, PRESET_SAMPLES.length, ...PRESET_SAMPLES);
    }

    // Sort items based on sortBy
    if (sortBy === 'uncertainty') {
      items.sort((a, b) => {
        const aVal = a.uncertainty.epistemic_score + a.uncertainty.aleatoric_score;
        const bVal = b.uncertainty.epistemic_score + b.uncertainty.aleatoric_score;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    } else if (sortBy === 'risk') {
      items.sort((a, b) => {
        return sortOrder === 'desc'
          ? b.risk.expected_risk - a.risk.expected_risk
          : a.risk.expected_risk - b.risk.expected_risk;
      });
    } else if (sortBy === 'novelty') {
      items.sort((a, b) => {
        return sortOrder === 'desc'
          ? b.novelty_score - a.novelty_score
          : a.novelty_score - b.novelty_score;
      });
    }

    return HttpResponse.json({
      items,
      total,
      page,
      page_size: pageSize,
      has_more: page * pageSize < total,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  });
}

/**
 * Creates GET /api/samples/:id handler.
 */
export function createSampleByIdHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/samples/:id`, async ({ params }) => {
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

    return HttpResponse.json(createSampleMetadata({ id: id as string }));
  });
}

/**
 * Creates POST /api/acquisition/select handler.
 */
export function createAcquisitionSelectHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/acquisition/select`, async ({ request }) => {
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

    const body = await request.json() as {
      batch_size?: number;
      config?: Partial<ReturnType<typeof createAcquisitionConfig>>;
      pool_ids?: string[];
    };

    const batchSize = body.batch_size ?? 10;

    return HttpResponse.json(
      createBatchSelectionResult({
        selected_ids: Array.from({ length: batchSize }, () =>
          Math.random().toString(36).slice(2, 11)
        ),
      })
    );
  });
}

/**
 * Creates GET /api/acquisition/config handler.
 */
export function createAcquisitionConfigHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/acquisition/config`, async () => {
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

    return HttpResponse.json(createAcquisitionConfig());
  });
}

/**
 * Creates PATCH /api/acquisition/config handler.
 */
export function createUpdateAcquisitionConfigHandler(options: HandlerOptions = {}) {
  return http.patch(`${API_BASE}/acquisition/config`, async ({ request }) => {
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

    return HttpResponse.json(createAcquisitionConfig(body));
  });
}

/**
 * Creates POST /api/samples/label handler.
 */
export function createLabelSamplesHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/samples/label`, async ({ request }) => {
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

    const body = await request.json() as {
      sample_ids: string[];
      labels: unknown[];
    };

    return HttpResponse.json({
      success: true,
      labeled_count: body.sample_ids.length,
      sample_ids: body.sample_ids,
    });
  });
}

/**
 * Creates GET /api/acquisition/history handler.
 */
export function createAcquisitionHistoryHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/acquisition/history`, async ({ request }) => {
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
    const limit = parseInt(url.searchParams.get('limit') ?? '10');

    const history = Array.from({ length: limit }, (_, i) => ({
      id: Math.random().toString(36).slice(2, 11),
      timestamp: Date.now() - i * 3600000,
      batch_size: Math.floor(Math.random() * 20) + 5,
      config: createAcquisitionConfig(),
      result: createBatchSelectionResult(),
    }));

    return HttpResponse.json({
      history,
      total: 50,
    });
  });
}

/**
 * Creates POST /api/ood/detect handler.
 */
export function createOODDetectHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/ood/detect`, async () => {
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

    return HttpResponse.json(createOODResult());
  });
}

/**
 * Creates POST /api/ood/batch-detect handler.
 */
export function createOODBatchDetectHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/ood/batch-detect`, async ({ request }) => {
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

    const body = await request.json() as { features: number[][] };
    const batchSize = body.features?.length ?? 10;

    return HttpResponse.json({
      results: createMany(createOODResult, batchSize),
      processing_time_ms: Math.random() * 200 + 100,
    });
  });
}

/**
 * Creates GET /api/ood/threshold handler.
 */
export function createOODThresholdHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/ood/threshold`, async () => {
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
      threshold: 0.5,
      calibration_method: 'percentile',
      calibration_percentile: 95,
      detector_thresholds: {
        mahalanobis: 0.45,
        energy: 0.55,
        label_shift: 0.5,
      },
    });
  });
}

/**
 * Creates PUT /api/ood/threshold handler.
 */
export function createSetOODThresholdHandler(options: HandlerOptions = {}) {
  return http.put(`${API_BASE}/ood/threshold`, async ({ request }) => {
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

    const body = await request.json() as { threshold: number };

    return HttpResponse.json({
      threshold: body.threshold,
      previous_threshold: 0.5,
      updated_at: Date.now(),
    });
  });
}

// ============================================================================
// Default Handlers
// ============================================================================

export const activeLearningHandlers = [
  http.get(`${API_BASE}/samples`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '10');

    return HttpResponse.json({
      items: createMany(createSampleMetadata, pageSize),
      total: 1000,
      page,
      page_size: pageSize,
      has_more: page * pageSize < 1000,
    });
  }),

  http.get(`${API_BASE}/samples/:id`, async ({ params }) => {
    await delay(100);
    return HttpResponse.json(createSampleMetadata({ id: params.id as string }));
  }),

  http.post(`${API_BASE}/acquisition/select`, async () => {
    await delay(200);
    return HttpResponse.json(createBatchSelectionResult());
  }),

  http.get(`${API_BASE}/acquisition/config`, async () => {
    await delay(100);
    return HttpResponse.json(createAcquisitionConfig());
  }),

  http.patch(`${API_BASE}/acquisition/config`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(createAcquisitionConfig(body));
  }),

  http.post(`${API_BASE}/samples/label`, async ({ request }) => {
    await delay(150);
    const body = await request.json() as { sample_ids: string[] };
    return HttpResponse.json({
      success: true,
      labeled_count: body.sample_ids.length,
    });
  }),

  http.get(`${API_BASE}/acquisition/history`, async () => {
    await delay(100);
    return HttpResponse.json({
      history: Array.from({ length: 10 }, () => ({
        timestamp: Date.now() - Math.random() * 86400000,
        batch_size: Math.floor(Math.random() * 20) + 5,
        result: createBatchSelectionResult(),
      })),
      total: 50,
    });
  }),

  http.post(`${API_BASE}/ood/detect`, async () => {
    await delay(100);
    return HttpResponse.json(createOODResult());
  }),

  http.post(`${API_BASE}/ood/batch-detect`, async ({ request }) => {
    await delay(200);
    const body = await request.json() as { features: number[][] };
    return HttpResponse.json({
      results: createMany(createOODResult, body.features?.length ?? 10),
    });
  }),

  http.get(`${API_BASE}/ood/threshold`, async () => {
    await delay(50);
    return HttpResponse.json({ threshold: 0.5 });
  }),

  http.put(`${API_BASE}/ood/threshold`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as { threshold: number };
    return HttpResponse.json({
      threshold: body.threshold,
      previous_threshold: 0.5,
    });
  }),
];

// OOD-specific handlers for backwards compatibility
export const oodHandlers = [
  http.post(`${API_BASE}/ood/detect`, async () => {
    await delay(100);
    return HttpResponse.json(createOODResult());
  }),

  http.post(`${API_BASE}/ood/batch-detect`, async ({ request }) => {
    await delay(200);
    const body = await request.json() as { features: number[][] };
    return HttpResponse.json({
      results: createMany(createOODResult, body.features.length),
    });
  }),

  http.get(`${API_BASE}/ood/threshold`, async () => {
    await delay(50);
    return HttpResponse.json({ threshold: 0.5 });
  }),
];

export default activeLearningHandlers;
