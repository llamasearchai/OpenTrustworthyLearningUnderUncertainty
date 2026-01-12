/**
 * Uncertainty API Handlers
 *
 * MSW handlers for uncertainty estimation endpoints.
 *
 * @module tests/mocks/handlers/uncertainty-handlers
 */

import { http, HttpResponse, delay } from 'msw';
import {
  createUncertaintyEstimate,
  createMany,
} from '../factories';

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
 * Creates GET /api/uncertainty/estimate handler.
 */
export function createEstimateHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/uncertainty/estimate`, async () => {
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

    return HttpResponse.json(createUncertaintyEstimate());
  });
}

/**
 * Creates GET /api/uncertainty/history handler.
 */
export function createHistoryHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/uncertainty/history`, async ({ request }) => {
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
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '50');
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');

    const items = Array.from({ length: pageSize }, (_, i) => ({
      timestamp: Date.now() - i * 60000,
      value: Math.random(),
      aleatoric: Math.random() * 0.3,
      epistemic: Math.random() * 0.3,
      source: 'ensemble_variance',
    }));

    return HttpResponse.json({
      items,
      total: 500,
      page,
      page_size: pageSize,
      has_more: page * pageSize < 500,
      start_time: startTime ?? items[items.length - 1]?.timestamp,
      end_time: endTime ?? items[0]?.timestamp,
    });
  });
}

/**
 * Creates POST /api/uncertainty/decompose handler.
 */
export function createDecomposeHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/uncertainty/decompose`, async ({ request }) => {
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

    const body = await request.json() as { features?: number[][]; method?: string };
    const method = body.method ?? 'ensemble_variance';

    const aleatoric = 0.15 + Math.random() * 0.1;
    const epistemic = 0.25 + Math.random() * 0.1;

    return HttpResponse.json({
      total: aleatoric + epistemic,
      aleatoric,
      epistemic,
      confidence: 1 - (aleatoric + epistemic),
      source: method,
      decomposition_method: method,
      components: {
        data_noise: aleatoric * 0.7,
        label_noise: aleatoric * 0.3,
        model_uncertainty: epistemic * 0.6,
        approximation_uncertainty: epistemic * 0.4,
      },
    });
  });
}

/**
 * Creates GET /api/uncertainty/calibration handler.
 */
export function createCalibrationHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/uncertainty/calibration`, async () => {
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

    const bins = Array.from({ length: 10 }, (_, i) => {
      const confidence = (i + 0.5) / 10;
      const gap = Math.random() * 0.1 - 0.05;
      return {
        confidence,
        accuracy: Math.max(0, Math.min(1, confidence + gap)),
        count: Math.floor(Math.random() * 1000) + 100,
      };
    });

    return HttpResponse.json({
      ece: Math.random() * 0.1,
      brier_score: Math.random() * 0.2,
      nll: Math.random() * 0.5 + 0.5,
      bins,
      total_samples: bins.reduce((sum, b) => sum + b.count, 0),
    });
  });
}

/**
 * Creates POST /api/uncertainty/batch handler.
 */
export function createBatchEstimateHandler(options: HandlerOptions = {}) {
  return http.post(`${API_BASE}/uncertainty/batch`, async ({ request }) => {
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
      estimates: createMany(createUncertaintyEstimate, batchSize),
      processing_time_ms: Math.random() * 100 + 50,
    });
  });
}

/**
 * Creates GET /api/uncertainty/methods handler.
 */
export function createMethodsHandler(options: HandlerOptions = {}) {
  return http.get(`${API_BASE}/uncertainty/methods`, async () => {
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
      methods: [
        {
          id: 'ensemble_variance',
          name: 'Ensemble Variance',
          description: 'Variance across ensemble predictions',
          supports_decomposition: true,
        },
        {
          id: 'mc_dropout',
          name: 'MC Dropout',
          description: 'Monte Carlo Dropout uncertainty estimation',
          supports_decomposition: true,
        },
        {
          id: 'deep_ensemble',
          name: 'Deep Ensemble',
          description: 'Deep ensemble uncertainty estimation',
          supports_decomposition: true,
        },
        {
          id: 'evidential',
          name: 'Evidential Deep Learning',
          description: 'Evidential uncertainty estimation',
          supports_decomposition: false,
        },
      ],
      default_method: 'ensemble_variance',
    });
  });
}

// ============================================================================
// Default Handlers
// ============================================================================

export const uncertaintyHandlers = [
  http.get(`${API_BASE}/uncertainty/estimate`, async () => {
    await delay(100);
    return HttpResponse.json(createUncertaintyEstimate());
  }),

  http.get(`${API_BASE}/uncertainty/history`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '50');

    const items = Array.from({ length: pageSize }, (_, i) => ({
      timestamp: Date.now() - i * 60000,
      value: Math.random(),
      aleatoric: Math.random() * 0.3,
      epistemic: Math.random() * 0.3,
      source: 'ensemble_variance',
    }));

    return HttpResponse.json({
      items,
      total: 500,
      page,
      page_size: pageSize,
      has_more: page * pageSize < 500,
    });
  }),

  http.post(`${API_BASE}/uncertainty/decompose`, async () => {
    await delay(100);
    return HttpResponse.json({
      total: 0.4,
      aleatoric: 0.15,
      epistemic: 0.25,
      confidence: 0.6,
      source: 'ensemble_variance',
    });
  }),

  http.get(`${API_BASE}/uncertainty/calibration`, async () => {
    await delay(100);
    const bins = Array.from({ length: 10 }, (_, i) => ({
      confidence: (i + 0.5) / 10,
      accuracy: (i + 0.5) / 10 + (Math.random() * 0.1 - 0.05),
      count: Math.floor(Math.random() * 1000) + 100,
    }));

    return HttpResponse.json({
      ece: 0.05,
      brier_score: 0.12,
      nll: 0.65,
      bins,
    });
  }),

  http.post(`${API_BASE}/uncertainty/batch`, async ({ request }) => {
    await delay(150);
    const body = await request.json() as { features: number[][] };
    const batchSize = body.features?.length ?? 10;

    return HttpResponse.json({
      estimates: createMany(createUncertaintyEstimate, batchSize),
    });
  }),

  http.get(`${API_BASE}/uncertainty/methods`, async () => {
    await delay(50);
    return HttpResponse.json({
      methods: [
        { id: 'ensemble_variance', name: 'Ensemble Variance', supports_decomposition: true },
        { id: 'mc_dropout', name: 'MC Dropout', supports_decomposition: true },
        { id: 'deep_ensemble', name: 'Deep Ensemble', supports_decomposition: true },
        { id: 'evidential', name: 'Evidential', supports_decomposition: false },
      ],
      default_method: 'ensemble_variance',
    });
  }),
];

export default uncertaintyHandlers;
