/**
 * Three.js Utilities
 *
 * Comprehensive utilities for React Three Fiber applications including
 * interactions, animations, effects, and performance optimization.
 *
 * @module lib/three
 */

// ============================================================================
// Interactions
// ============================================================================

export {
  useRaycast,
  useHover,
  useSelect,
  useDrag,
  useTransformControls,
  useClickOutside,
  useDoubleClick,
  getIntersectionUserData,
  getIntersectionId,
  filterByUserData,
  filterByLayer,
} from './interactions';

export type {
  RaycastOptions,
  RaycastResult,
  HoverState,
  SelectionMode,
  SelectionState,
  DragOptions,
  DragState,
  TransformMode,
  TransformSpace,
  TransformControlsState,
} from './interactions';

// ============================================================================
// Animations
// ============================================================================

export {
  useFrameAnimation,
  useSpringAnimation,
  useFloat,
  useRotate,
  useFollow,
  useLookAt,
  useAnimationPreset,
  usePrefersReducedMotion,
  animated,
  easings,
  springConfigs,
} from './animations';

export type {
  AnimationPreset,
  FrameAnimationOptions,
  SpringAnimationConfig,
  SpringAnimationResult,
  FloatOptions,
  FloatResult,
  RotateOptions,
  RotateResult,
  FollowOptions,
  FollowResult,
  LookAtOptions,
  LookAtResult,
  AnimationState,
  PresetOptions,
  PresetResult,
} from './animations';

// ============================================================================
// Effects
// ============================================================================

export {
  Effects,
  useEffects,
  useOutlineSelection,
  SelectiveBloomEffect,
  effectPresets,
  DEFAULT_BLOOM_CONFIG,
  DEFAULT_SSAO_CONFIG,
  DEFAULT_DOF_CONFIG,
  DEFAULT_VIGNETTE_CONFIG,
  DEFAULT_CHROMATIC_ABERRATION_CONFIG,
  DEFAULT_NOISE_CONFIG,
  DEFAULT_OUTLINE_CONFIG,
  BlendFunction,
  KernelSize,
} from './effects';

export type {
  BloomConfig,
  SSAOConfig,
  DOFConfig,
  VignetteConfig,
  ChromaticAberrationConfig,
  NoiseConfig,
  OutlineConfig,
  EffectsConfig,
  EffectsProps,
  UseEffectsResult,
  UseOutlineSelectionResult,
  SelectiveBloomProps,
} from './effects';

// ============================================================================
// Performance
// ============================================================================

export {
  useLOD,
  useInstances,
  useOcclusionCulling,
  useFrustumCulling,
  usePerformanceBudget,
  usePerformanceMonitor,
  useMemoryStats,
  disposeGeometry,
  disposeMaterial,
  disposeObject,
  DEFAULT_BUDGET,
} from './performance';

export type {
  LODLevel,
  LODOptions,
  LODResult,
  InstancesOptions,
  InstanceTransform,
  InstancesResult,
  CullingOptions,
  CullingResult,
  PerformanceBudget,
  PerformanceMetrics,
  BudgetStatus,
  PerformanceMonitorOptions,
  MemoryStats,
} from './performance';
