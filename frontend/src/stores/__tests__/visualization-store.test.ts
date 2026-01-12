/**
 * Visualization Store Tests
 *
 * Test suite for the visualization store.
 *
 * @module stores/__tests__/visualization-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualizationStore } from '../visualization-store';

describe('useVisualizationStore', () => {
  beforeEach(() => {
    useVisualizationStore.getState().reset();
  });

  describe('Filters', () => {
    it('should set filter', () => {
      const store = useVisualizationStore.getState();
      store.setFilter('test', { type: 'range', value: [0, 100] });
      expect(store.hasFilter('test')).toBe(true);
    });

    it('should remove filter', () => {
      const store = useVisualizationStore.getState();
      store.setFilter('test', { type: 'range', value: [0, 100] });
      store.removeFilter('test');
      expect(store.hasFilter('test')).toBe(false);
    });

    it('should clear all filters', () => {
      const store = useVisualizationStore.getState();
      store.setFilter('test1', { type: 'range', value: [0, 100] });
      store.setFilter('test2', { type: 'categorical', value: ['a'] });
      store.clearFilters();
      expect(store.hasFilter('test1')).toBe(false);
      expect(store.hasFilter('test2')).toBe(false);
    });
  });

  describe('Zoom and Pan', () => {
    it('should set zoom level', () => {
      const store = useVisualizationStore.getState();
      store.setZoomLevel(2);
      const state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBe(2);
    });

    it('should clamp zoom level', () => {
      const store = useVisualizationStore.getState();
      store.setZoomLevel(10);
      let state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBeLessThanOrEqual(4);
      store.setZoomLevel(-1);
      state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBeGreaterThanOrEqual(0.25);
    });

    it('should zoom in', () => {
      const store = useVisualizationStore.getState();
      const initial = store.zoomLevel;
      store.zoomIn();
      const state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBeGreaterThan(initial);
    });

    it('should zoom out', () => {
      const store = useVisualizationStore.getState();
      store.setZoomLevel(2);
      const initial = useVisualizationStore.getState().zoomLevel;
      store.zoomOut();
      const state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBeLessThan(initial);
    });

    it('should reset zoom', () => {
      const store = useVisualizationStore.getState();
      store.setZoomLevel(2);
      store.resetZoom();
      const state = useVisualizationStore.getState();
      expect(state.zoomLevel).toBe(1);
    });

    it('should set pan offset', () => {
      const store = useVisualizationStore.getState();
      store.setPanOffset({ x: 10, y: 20 });
      const state = useVisualizationStore.getState();
      expect(state.panOffset).toEqual({ x: 10, y: 20 });
    });

    it('should reset pan', () => {
      const store = useVisualizationStore.getState();
      store.setPanOffset({ x: 10, y: 20 });
      store.resetPan();
      const state = useVisualizationStore.getState();
      expect(state.panOffset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Highlighted Points', () => {
    it('should highlight point', () => {
      const store = useVisualizationStore.getState();
      store.highlightPoint('point-1');
      const state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.has('point-1')).toBe(true);
    });

    it('should unhighlight point', () => {
      const store = useVisualizationStore.getState();
      store.highlightPoint('point-1');
      store.unhighlightPoint('point-1');
      const state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.has('point-1')).toBe(false);
    });

    it('should toggle highlight', () => {
      const store = useVisualizationStore.getState();
      store.toggleHighlight('point-1');
      let state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.has('point-1')).toBe(true);
      store.toggleHighlight('point-1');
      state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.has('point-1')).toBe(false);
    });

    it('should set highlighted points', () => {
      const store = useVisualizationStore.getState();
      store.setHighlightedPoints(['point-1', 'point-2']);
      const state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.size).toBe(2);
    });

    it('should clear highlights', () => {
      const store = useVisualizationStore.getState();
      store.highlightPoint('point-1');
      store.clearHighlights();
      const state = useVisualizationStore.getState();
      expect(state.highlightedDataPoints.size).toBe(0);
    });
  });

  describe('Brush Selection', () => {
    it('should set brush selection', () => {
      const store = useVisualizationStore.getState();
      const selection = {
        x: { min: 0, max: 100 },
        y: { min: 0, max: 200 },
      };
      store.setBrushSelection(selection);
      const state = useVisualizationStore.getState();
      expect(state.brushSelection).toEqual(selection);
    });

    it('should clear brush selection', () => {
      const store = useVisualizationStore.getState();
      store.setBrushSelection({
        x: { min: 0, max: 100 },
        y: { min: 0, max: 200 },
      });
      store.clearBrushSelection();
      const state = useVisualizationStore.getState();
      expect(state.brushSelection).toBeNull();
    });
  });

  describe('Chart State', () => {
    it('should set chart state', () => {
      const store = useVisualizationStore.getState();
      store.setChartState('chart-1', { zoomLevel: 2 });
      const state = store.getChartState('chart-1');
      expect(state?.zoomLevel).toBe(2);
    });

    it('should clear chart state', () => {
      const store = useVisualizationStore.getState();
      store.setChartState('chart-1', { zoomLevel: 2 });
      store.clearChartState('chart-1');
      expect(store.getChartState('chart-1')).toBeUndefined();
    });
  });

  describe('View Mode', () => {
    it('should set view mode', () => {
      const store = useVisualizationStore.getState();
      store.setViewMode('single');
      const state = useVisualizationStore.getState();
      expect(state.viewMode).toBe('single');
    });
  });

  describe('Metrics', () => {
    it('should set selected metrics', () => {
      const store = useVisualizationStore.getState();
      store.setSelectedMetrics(['metric1', 'metric2']);
      const state = useVisualizationStore.getState();
      expect(state.selectedMetrics).toEqual(['metric1', 'metric2']);
    });

    it('should toggle metric', () => {
      const store = useVisualizationStore.getState();
      store.setSelectedMetrics(['metric1']);
      store.toggleMetric('metric2');
      let state = useVisualizationStore.getState();
      expect(state.selectedMetrics).toContain('metric2');
      store.toggleMetric('metric1');
      state = useVisualizationStore.getState();
      expect(state.selectedMetrics).not.toContain('metric1');
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      const store = useVisualizationStore.getState();
      store.setFilter('test', { type: 'range', value: [0, 100] });
      store.setZoomLevel(2);
      store.highlightPoint('point-1');
      store.reset();
      const state = useVisualizationStore.getState();
      expect(state.hasFilter('test')).toBe(false);
      expect(state.zoomLevel).toBe(1);
      expect(state.highlightedDataPoints.size).toBe(0);
    });
  });
});
