/**
 * Visualization State Store
 *
 * Manages chart visualization state including filters, brush selection,
 * zoom levels, and cross-filtering.
 *
 * @module stores/visualization-store
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface BrushSelection {
  x: { min: number; max: number };
  y: { min: number; max: number };
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface FilterValue {
  type: 'range' | 'categorical' | 'search';
  value: unknown;
}

export interface ChartState {
  id: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  brushSelection: BrushSelection | null;
  highlightedPoints: Set<string>;
}

export interface VisualizationState {
  // Active filters
  activeFilters: Record<string, FilterValue>;

  // Brush selection (for linked views)
  brushSelection: BrushSelection | null;

  // Zoom and pan
  zoomLevel: number;
  panOffset: { x: number; y: number };

  // Highlighted data points
  highlightedDataPoints: Set<string>;

  // Cross-filter source (which chart initiated the filter)
  crossFilterSource: string | null;

  // Time range filter
  timeRange: TimeRange | null;

  // Per-chart state
  chartStates: Record<string, ChartState>;

  // View mode
  viewMode: 'grid' | 'single' | 'comparison';

  // Selected metrics for display
  selectedMetrics: string[];

  // Color scale domain overrides
  colorDomainOverrides: Record<string, [number, number]>;
}

export interface VisualizationActions {
  // Filter actions
  setFilter: (key: string, value: FilterValue) => void;
  removeFilter: (key: string) => void;
  clearFilters: () => void;
  hasFilter: (key: string) => boolean;

  // Brush selection
  setBrushSelection: (selection: BrushSelection | null) => void;
  clearBrushSelection: () => void;

  // Zoom and pan
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  resetPan: () => void;

  // Highlighted points
  highlightPoint: (id: string) => void;
  unhighlightPoint: (id: string) => void;
  toggleHighlight: (id: string) => void;
  setHighlightedPoints: (ids: string[]) => void;
  clearHighlights: () => void;

  // Cross-filter
  setCrossFilterSource: (source: string | null) => void;
  applyCrossFilter: (source: string, selection: BrushSelection) => void;
  clearCrossFilter: () => void;

  // Time range
  setTimeRange: (range: TimeRange | null) => void;
  clearTimeRange: () => void;

  // Chart state
  setChartState: (chartId: string, state: Partial<ChartState>) => void;
  getChartState: (chartId: string) => ChartState | undefined;
  clearChartState: (chartId: string) => void;

  // View mode
  setViewMode: (mode: 'grid' | 'single' | 'comparison') => void;

  // Metrics
  setSelectedMetrics: (metrics: string[]) => void;
  toggleMetric: (metric: string) => void;

  // Color domain
  setColorDomainOverride: (chartId: string, domain: [number, number]) => void;
  clearColorDomainOverride: (chartId: string) => void;

  // Reset
  reset: () => void;
}

export type VisualizationStore = VisualizationState & VisualizationActions;

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const initialState: VisualizationState = {
  activeFilters: {},
  brushSelection: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  highlightedDataPoints: new Set(),
  crossFilterSource: null,
  timeRange: null,
  chartStates: {},
  viewMode: 'grid',
  selectedMetrics: [],
  colorDomainOverrides: {},
};

// ============================================================================
// Store
// ============================================================================

export const useVisualizationStore = create<VisualizationStore>()(
  immer((set, get) => ({
    ...initialState,

    // Filter actions
    setFilter: (key, value) =>
      set((state) => {
        state.activeFilters[key] = value;
      }),

    removeFilter: (key) =>
      set((state) => {
        delete state.activeFilters[key];
      }),

    clearFilters: () =>
      set((state) => {
        state.activeFilters = {};
      }),

    hasFilter: (key) => key in get().activeFilters,

    // Brush selection
    setBrushSelection: (selection) =>
      set((state) => {
        state.brushSelection = selection;
      }),

    clearBrushSelection: () =>
      set((state) => {
        state.brushSelection = null;
      }),

    // Zoom and pan
    setZoomLevel: (level) =>
      set((state) => {
        state.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
      }),

    zoomIn: () =>
      set((state) => {
        state.zoomLevel = Math.min(MAX_ZOOM, state.zoomLevel + ZOOM_STEP);
      }),

    zoomOut: () =>
      set((state) => {
        state.zoomLevel = Math.max(MIN_ZOOM, state.zoomLevel - ZOOM_STEP);
      }),

    resetZoom: () =>
      set((state) => {
        state.zoomLevel = 1;
      }),

    setPanOffset: (offset) =>
      set((state) => {
        state.panOffset = offset;
      }),

    resetPan: () =>
      set((state) => {
        state.panOffset = { x: 0, y: 0 };
      }),

    // Highlighted points
    highlightPoint: (id) =>
      set((state) => {
        state.highlightedDataPoints.add(id);
      }),

    unhighlightPoint: (id) =>
      set((state) => {
        state.highlightedDataPoints.delete(id);
      }),

    toggleHighlight: (id) =>
      set((state) => {
        if (state.highlightedDataPoints.has(id)) {
          state.highlightedDataPoints.delete(id);
        } else {
          state.highlightedDataPoints.add(id);
        }
      }),

    setHighlightedPoints: (ids) =>
      set((state) => {
        state.highlightedDataPoints = new Set(ids);
      }),

    clearHighlights: () =>
      set((state) => {
        state.highlightedDataPoints.clear();
      }),

    // Cross-filter
    setCrossFilterSource: (source) =>
      set((state) => {
        state.crossFilterSource = source;
      }),

    applyCrossFilter: (source, selection) =>
      set((state) => {
        state.crossFilterSource = source;
        state.brushSelection = selection;
      }),

    clearCrossFilter: () =>
      set((state) => {
        state.crossFilterSource = null;
        state.brushSelection = null;
      }),

    // Time range
    setTimeRange: (range) =>
      set((state) => {
        state.timeRange = range;
      }),

    clearTimeRange: () =>
      set((state) => {
        state.timeRange = null;
      }),

    // Chart state
    setChartState: (chartId, partialState) =>
      set((state) => {
        const existing = state.chartStates[chartId] ?? {
          id: chartId,
          zoomLevel: 1,
          panOffset: { x: 0, y: 0 },
          brushSelection: null,
          highlightedPoints: new Set(),
        };
        state.chartStates[chartId] = { ...existing, ...partialState };
      }),

    getChartState: (chartId) => get().chartStates[chartId],

    clearChartState: (chartId) =>
      set((state) => {
        delete state.chartStates[chartId];
      }),

    // View mode
    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    // Metrics
    setSelectedMetrics: (metrics) =>
      set((state) => {
        state.selectedMetrics = metrics;
      }),

    toggleMetric: (metric) =>
      set((state) => {
        const index = state.selectedMetrics.indexOf(metric);
        if (index >= 0) {
          state.selectedMetrics.splice(index, 1);
        } else {
          state.selectedMetrics.push(metric);
        }
      }),

    // Color domain
    setColorDomainOverride: (chartId, domain) =>
      set((state) => {
        state.colorDomainOverrides[chartId] = domain;
      }),

    clearColorDomainOverride: (chartId) =>
      set((state) => {
        delete state.colorDomainOverrides[chartId];
      }),

    // Reset
    reset: () =>
      set(() => ({
        ...initialState,
        highlightedDataPoints: new Set(),
      })),
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveFilters = (state: VisualizationStore) => state.activeFilters;
export const selectBrushSelection = (state: VisualizationStore) => state.brushSelection;
export const selectZoomLevel = (state: VisualizationStore) => state.zoomLevel;
export const selectHighlightedPoints = (state: VisualizationStore) =>
  state.highlightedDataPoints;
export const selectCrossFilterSource = (state: VisualizationStore) =>
  state.crossFilterSource;
export const selectTimeRange = (state: VisualizationStore) => state.timeRange;
export const selectViewMode = (state: VisualizationStore) => state.viewMode;
export const selectSelectedMetrics = (state: VisualizationStore) => state.selectedMetrics;

export const selectIsPointHighlighted = (id: string) => (state: VisualizationStore) =>
  state.highlightedDataPoints.has(id);

export const selectHasActiveFilters = (state: VisualizationStore) =>
  Object.keys(state.activeFilters).length > 0;

export const selectFilterCount = (state: VisualizationStore) =>
  Object.keys(state.activeFilters).length;
