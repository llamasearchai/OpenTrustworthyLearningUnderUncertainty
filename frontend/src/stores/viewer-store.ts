/**
 * Viewer Settings Store
 *
 * Manages 3D viewer preferences including rendering options.
 *
 * @module stores/viewer-store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface ViewerSettings {
  // Rendering
  shadows: boolean;
  postProcessing: boolean;
  antiAliasing: boolean;
  ambientOcclusion: boolean;

  // Performance
  targetFPS: 30 | 60;
  qualityLevel: 'low' | 'medium' | 'high';

  // Camera
  autoRotate: boolean;
  fieldOfView: number;

  // Grid & Helpers
  showGrid: boolean;
  showAxes: boolean;

  // Colors
  backgroundColor: string;
  gridColor: string;
}

export interface ViewerState extends ViewerSettings {
  // Actions
  setShadows: (enabled: boolean) => void;
  setPostProcessing: (enabled: boolean) => void;
  setAntiAliasing: (enabled: boolean) => void;
  setAmbientOcclusion: (enabled: boolean) => void;
  setTargetFPS: (fps: 30 | 60) => void;
  setQualityLevel: (level: 'low' | 'medium' | 'high') => void;
  setAutoRotate: (enabled: boolean) => void;
  setFieldOfView: (fov: number) => void;
  setShowGrid: (enabled: boolean) => void;
  setShowAxes: (enabled: boolean) => void;
  setBackgroundColor: (color: string) => void;
  setGridColor: (color: string) => void;
  resetToDefaults: () => void;
}

// ============================================================================
// Defaults
// ============================================================================

const defaultSettings: ViewerSettings = {
  shadows: true,
  postProcessing: true,
  antiAliasing: true,
  ambientOcclusion: true,
  targetFPS: 60,
  qualityLevel: 'high',
  autoRotate: false,
  fieldOfView: 75,
  showGrid: true,
  showAxes: false,
  backgroundColor: '#1a1a2e',
  gridColor: '#333366',
};

// ============================================================================
// Store
// ============================================================================

export const useViewerStore = create<ViewerState>()(
  persist(
    immer((set) => ({
      ...defaultSettings,

      setShadows: (enabled) =>
        set((state) => {
          state.shadows = enabled;
        }),

      setPostProcessing: (enabled) =>
        set((state) => {
          state.postProcessing = enabled;
        }),

      setAntiAliasing: (enabled) =>
        set((state) => {
          state.antiAliasing = enabled;
        }),

      setAmbientOcclusion: (enabled) =>
        set((state) => {
          state.ambientOcclusion = enabled;
        }),

      setTargetFPS: (fps) =>
        set((state) => {
          state.targetFPS = fps;
        }),

      setQualityLevel: (level) =>
        set((state) => {
          state.qualityLevel = level;
        }),

      setAutoRotate: (enabled) =>
        set((state) => {
          state.autoRotate = enabled;
        }),

      setFieldOfView: (fov) =>
        set((state) => {
          state.fieldOfView = Math.max(30, Math.min(120, fov));
        }),

      setShowGrid: (enabled) =>
        set((state) => {
          state.showGrid = enabled;
        }),

      setShowAxes: (enabled) =>
        set((state) => {
          state.showAxes = enabled;
        }),

      setBackgroundColor: (color) =>
        set((state) => {
          state.backgroundColor = color;
        }),

      setGridColor: (color) =>
        set((state) => {
          state.gridColor = color;
        }),

      resetToDefaults: () =>
        set((state) => {
          Object.assign(state, defaultSettings);
        }),
    })),
    {
      name: 'opentlu-viewer-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectViewerSettings = (state: ViewerState): ViewerSettings => ({
  shadows: state.shadows,
  postProcessing: state.postProcessing,
  antiAliasing: state.antiAliasing,
  ambientOcclusion: state.ambientOcclusion,
  targetFPS: state.targetFPS,
  qualityLevel: state.qualityLevel,
  autoRotate: state.autoRotate,
  fieldOfView: state.fieldOfView,
  showGrid: state.showGrid,
  showAxes: state.showAxes,
  backgroundColor: state.backgroundColor,
  gridColor: state.gridColor,
});
