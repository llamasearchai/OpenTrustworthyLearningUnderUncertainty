/**
 * Three.js Scene State Store
 *
 * Manages 3D scene state including camera, selection, and animation.
 *
 * @module stores/three-store
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Vector3 } from 'three';

// ============================================================================
// Types
// ============================================================================

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export type AnimationState = 'playing' | 'paused' | 'stopped';

export interface SceneConfig {
  environment: boolean;
  shadows: boolean;
  postProcessing: boolean;
  antialias: boolean;
  pixelRatio: number;
}

export interface CameraState {
  position: Vector3Like;
  target: Vector3Like;
  fov: number;
  near: number;
  far: number;
  zoom: number;
}

export interface ThreeState {
  // Camera
  cameraPosition: Vector3Like;
  cameraTarget: Vector3Like;
  cameraFov: number;
  cameraZoom: number;

  // Selection
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  selectedObjectIds: Set<string>;

  // Animation
  animationState: AnimationState;
  currentAnimationTime: number;
  animationDuration: number;
  animationSpeed: number;

  // Scene configuration
  sceneConfig: SceneConfig;

  // Performance
  fps: number;
  drawCalls: number;
  triangles: number;

  // Loading
  loadingProgress: number;
  loadingAsset: string | null;

  // Transform controls
  transformMode: 'translate' | 'rotate' | 'scale' | null;
  transformSpace: 'world' | 'local';

  // Lighting
  ambientIntensity: number;
  directionalIntensity: number;
}

export interface ThreeActions {
  // Camera
  setCameraPosition: (position: Vector3Like) => void;
  setCameraTarget: (target: Vector3Like) => void;
  setCameraFov: (fov: number) => void;
  setCameraZoom: (zoom: number) => void;
  resetCamera: () => void;
  lookAt: (target: Vector3Like) => void;

  // Selection
  selectObject: (id: string | null) => void;
  hoverObject: (id: string | null) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // Animation
  setAnimationState: (state: AnimationState) => void;
  playAnimation: () => void;
  pauseAnimation: () => void;
  stopAnimation: () => void;
  setAnimationTime: (time: number) => void;
  setAnimationDuration: (duration: number) => void;
  setAnimationSpeed: (speed: number) => void;

  // Scene configuration
  updateSceneConfig: (config: Partial<SceneConfig>) => void;
  toggleShadows: () => void;
  togglePostProcessing: () => void;
  setPixelRatio: (ratio: number) => void;

  // Performance
  updatePerformanceMetrics: (fps: number, drawCalls: number, triangles: number) => void;

  // Loading
  setLoadingProgress: (progress: number, asset?: string) => void;
  clearLoading: () => void;

  // Transform controls
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale' | null) => void;
  setTransformSpace: (space: 'world' | 'local') => void;
  cycleTransformMode: () => void;

  // Lighting
  setAmbientIntensity: (intensity: number) => void;
  setDirectionalIntensity: (intensity: number) => void;
}

export type ThreeStore = ThreeState & ThreeActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CAMERA_POSITION: Vector3Like = { x: 0, y: 5, z: 10 };
const DEFAULT_CAMERA_TARGET: Vector3Like = { x: 0, y: 0, z: 0 };

const DEFAULT_SCENE_CONFIG: SceneConfig = {
  environment: true,
  shadows: true,
  postProcessing: true,
  antialias: true,
  pixelRatio: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1),
};

// ============================================================================
// Store
// ============================================================================

export const useThreeStore = create<ThreeStore>()(
  immer((set, get) => ({
    // Initial state
    cameraPosition: { ...DEFAULT_CAMERA_POSITION },
    cameraTarget: { ...DEFAULT_CAMERA_TARGET },
    cameraFov: 50,
    cameraZoom: 1,
    selectedObjectId: null,
    hoveredObjectId: null,
    selectedObjectIds: new Set(),
    animationState: 'stopped',
    currentAnimationTime: 0,
    animationDuration: 0,
    animationSpeed: 1,
    sceneConfig: { ...DEFAULT_SCENE_CONFIG },
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    loadingProgress: 0,
    loadingAsset: null,
    transformMode: null,
    transformSpace: 'world',
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,

    // Camera actions
    setCameraPosition: (position) =>
      set((state) => {
        state.cameraPosition = position;
      }),

    setCameraTarget: (target) =>
      set((state) => {
        state.cameraTarget = target;
      }),

    setCameraFov: (fov) =>
      set((state) => {
        state.cameraFov = Math.max(10, Math.min(120, fov));
      }),

    setCameraZoom: (zoom) =>
      set((state) => {
        state.cameraZoom = Math.max(0.1, Math.min(10, zoom));
      }),

    resetCamera: () =>
      set((state) => {
        state.cameraPosition = { ...DEFAULT_CAMERA_POSITION };
        state.cameraTarget = { ...DEFAULT_CAMERA_TARGET };
        state.cameraFov = 50;
        state.cameraZoom = 1;
      }),

    lookAt: (target) =>
      set((state) => {
        state.cameraTarget = target;
      }),

    // Selection actions
    selectObject: (id) =>
      set((state) => {
        state.selectedObjectId = id;
        state.selectedObjectIds.clear();
        if (id) {
          state.selectedObjectIds.add(id);
        }
      }),

    hoverObject: (id) =>
      set((state) => {
        state.hoveredObjectId = id;
      }),

    addToSelection: (id) =>
      set((state) => {
        state.selectedObjectIds.add(id);
        state.selectedObjectId = id;
      }),

    removeFromSelection: (id) =>
      set((state) => {
        state.selectedObjectIds.delete(id);
        if (state.selectedObjectId === id) {
          const remaining = Array.from(state.selectedObjectIds);
          state.selectedObjectId = remaining[0] ?? null;
        }
      }),

    toggleSelection: (id) => {
      const state = get();
      if (state.selectedObjectIds.has(id)) {
        state.removeFromSelection(id);
      } else {
        state.addToSelection(id);
      }
    },

    clearSelection: () =>
      set((state) => {
        state.selectedObjectId = null;
        state.selectedObjectIds.clear();
      }),

    isSelected: (id) => get().selectedObjectIds.has(id),

    // Animation actions
    setAnimationState: (animState) =>
      set((state) => {
        state.animationState = animState;
      }),

    playAnimation: () =>
      set((state) => {
        state.animationState = 'playing';
      }),

    pauseAnimation: () =>
      set((state) => {
        state.animationState = 'paused';
      }),

    stopAnimation: () =>
      set((state) => {
        state.animationState = 'stopped';
        state.currentAnimationTime = 0;
      }),

    setAnimationTime: (time) =>
      set((state) => {
        state.currentAnimationTime = Math.max(
          0,
          Math.min(time, state.animationDuration)
        );
      }),

    setAnimationDuration: (duration) =>
      set((state) => {
        state.animationDuration = Math.max(0, duration);
      }),

    setAnimationSpeed: (speed) =>
      set((state) => {
        state.animationSpeed = Math.max(0.1, Math.min(10, speed));
      }),

    // Scene configuration actions
    updateSceneConfig: (config) =>
      set((state) => {
        state.sceneConfig = { ...state.sceneConfig, ...config };
      }),

    toggleShadows: () =>
      set((state) => {
        state.sceneConfig.shadows = !state.sceneConfig.shadows;
      }),

    togglePostProcessing: () =>
      set((state) => {
        state.sceneConfig.postProcessing = !state.sceneConfig.postProcessing;
      }),

    setPixelRatio: (ratio) =>
      set((state) => {
        state.sceneConfig.pixelRatio = Math.max(0.5, Math.min(3, ratio));
      }),

    // Performance actions
    updatePerformanceMetrics: (fps, drawCalls, triangles) =>
      set((state) => {
        state.fps = fps;
        state.drawCalls = drawCalls;
        state.triangles = triangles;
      }),

    // Loading actions
    setLoadingProgress: (progress, asset) =>
      set((state) => {
        state.loadingProgress = Math.max(0, Math.min(100, progress));
        state.loadingAsset = asset ?? null;
      }),

    clearLoading: () =>
      set((state) => {
        state.loadingProgress = 0;
        state.loadingAsset = null;
      }),

    // Transform control actions
    setTransformMode: (mode) =>
      set((state) => {
        state.transformMode = mode;
      }),

    setTransformSpace: (space) =>
      set((state) => {
        state.transformSpace = space;
      }),

    cycleTransformMode: () =>
      set((state) => {
        const modes: Array<'translate' | 'rotate' | 'scale' | null> = [
          'translate',
          'rotate',
          'scale',
          null,
        ];
        const currentIndex = modes.indexOf(state.transformMode);
        state.transformMode = modes[(currentIndex + 1) % modes.length]!;
      }),

    // Lighting actions
    setAmbientIntensity: (intensity) =>
      set((state) => {
        state.ambientIntensity = Math.max(0, Math.min(3, intensity));
      }),

    setDirectionalIntensity: (intensity) =>
      set((state) => {
        state.directionalIntensity = Math.max(0, Math.min(5, intensity));
      }),
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCameraState = (state: ThreeStore): CameraState => ({
  position: state.cameraPosition,
  target: state.cameraTarget,
  fov: state.cameraFov,
  near: 0.1,
  far: 1000,
  zoom: state.cameraZoom,
});

export const selectSelectedObjectId = (state: ThreeStore) => state.selectedObjectId;
export const selectHoveredObjectId = (state: ThreeStore) => state.hoveredObjectId;
export const selectAnimationState = (state: ThreeStore) => state.animationState;
export const selectIsAnimating = (state: ThreeStore) => state.animationState === 'playing';
export const selectSceneConfig = (state: ThreeStore) => state.sceneConfig;
export const selectPerformanceMetrics = (state: ThreeStore) => ({
  fps: state.fps,
  drawCalls: state.drawCalls,
  triangles: state.triangles,
});
export const selectIsLoading = (state: ThreeStore) => state.loadingProgress > 0 && state.loadingProgress < 100;
export const selectTransformMode = (state: ThreeStore) => state.transformMode;
