/**
 * Viewer Store Tests
 *
 * Test suite for the viewer settings store.
 *
 * @module stores/__tests__/viewer-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { selectViewerSettings, useViewerStore } from '../viewer-store';

describe('useViewerStore', () => {
  beforeEach(() => {
    useViewerStore.getState().resetToDefaults();
  });

  it('should set rendering toggles', () => {
    const store = useViewerStore.getState();
    store.setShadows(false);
    store.setPostProcessing(false);
    store.setAntiAliasing(false);
    store.setAmbientOcclusion(false);
    const state = useViewerStore.getState();
    expect(state.shadows).toBe(false);
    expect(state.postProcessing).toBe(false);
    expect(state.antiAliasing).toBe(false);
    expect(state.ambientOcclusion).toBe(false);
  });

  it('should set performance settings', () => {
    const store = useViewerStore.getState();
    store.setTargetFPS(30);
    store.setQualityLevel('low');
    const state = useViewerStore.getState();
    expect(state.targetFPS).toBe(30);
    expect(state.qualityLevel).toBe('low');
  });

  it('should set camera settings', () => {
    const store = useViewerStore.getState();
    store.setAutoRotate(true);
    store.setFieldOfView(60);
    const state = useViewerStore.getState();
    expect(state.autoRotate).toBe(true);
    expect(state.fieldOfView).toBe(60);
  });

  it('should clamp field of view', () => {
    const store = useViewerStore.getState();
    store.setFieldOfView(10);
    expect(useViewerStore.getState().fieldOfView).toBe(30);
    store.setFieldOfView(1000);
    expect(useViewerStore.getState().fieldOfView).toBe(120);
  });

  it('should set helper toggles', () => {
    const store = useViewerStore.getState();
    store.setShowGrid(false);
    store.setShowAxes(true);
    const state = useViewerStore.getState();
    expect(state.showGrid).toBe(false);
    expect(state.showAxes).toBe(true);
  });

  it('should set colors', () => {
    const store = useViewerStore.getState();
    store.setBackgroundColor('#000000');
    store.setGridColor('#ffffff');
    const state = useViewerStore.getState();
    expect(state.backgroundColor).toBe('#000000');
    expect(state.gridColor).toBe('#ffffff');
  });

  it('should reset to defaults', () => {
    const store = useViewerStore.getState();
    store.setShadows(false);
    store.setTargetFPS(30);
    store.setBackgroundColor('#000000');
    store.resetToDefaults();
    const state = useViewerStore.getState();
    expect(state.shadows).toBe(true);
    expect(state.targetFPS).toBe(60);
    expect(state.backgroundColor).toBe('#1a1a2e');
  });

  it('should select viewer settings', () => {
    const state = useViewerStore.getState();
    const settings = selectViewerSettings(state);
    expect(settings.fieldOfView).toBe(state.fieldOfView);
    expect(settings.backgroundColor).toBe(state.backgroundColor);
  });
});

