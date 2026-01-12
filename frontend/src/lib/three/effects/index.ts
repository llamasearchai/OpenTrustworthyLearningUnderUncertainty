/**
 * Three.js Post-Processing Effects
 *
 * Comprehensive post-processing pipeline with support for bloom, SSAO, DOF,
 * vignette, chromatic aberration, noise, and custom outline effects.
 *
 * @module lib/three/effects
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Noise,
  Vignette,
  ChromaticAberration,
  SSAO,
  Outline,
  SelectiveBloom,
} from '@react-three/postprocessing';
import {
  Effect,
  Resolution,
  BlendFunction,
  KernelSize,
} from 'postprocessing';
export { BlendFunction, KernelSize };
import * as THREE from 'three';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

export interface BloomConfig {
  /** Enable bloom effect */
  enabled?: boolean;
  /** Bloom intensity (0-10) */
  intensity?: number;
  /** Luminance threshold (0-1) */
  luminanceThreshold?: number;
  /** Luminance smoothing (0-1) */
  luminanceSmoothing?: number;
  /** Kernel size for blur */
  kernelSize?: KernelSize;
  /** Mipmap blur */
  mipmapBlur?: boolean;
  /** Radius for blur */
  radius?: number;
}

export interface SSAOConfig {
  /** Enable SSAO effect */
  enabled?: boolean;
  /** Intensity (0-5) */
  intensity?: number;
  /** Radius in world units */
  radius?: number;
  /** Number of samples */
  samples?: number;
  /** Bias to reduce self-occlusion */
  bias?: number;
  /** Ring count for spiral sampling */
  rings?: number;
  /** Distance threshold */
  distanceThreshold?: number;
  /** Distance falloff */
  distanceFalloff?: number;
  /** Range threshold */
  rangeThreshold?: number;
  /** Range falloff */
  rangeFalloff?: number;
  /** Luminance influence */
  luminanceInfluence?: number;
  /** Resolution scale */
  resolutionScale?: number;
}

export interface DOFConfig {
  /** Enable depth of field effect */
  enabled?: boolean;
  /** Focus distance in world units */
  focusDistance?: number;
  /** Focal length */
  focalLength?: number;
  /** Bokeh blur scale */
  bokehScale?: number;
  /** Width of focus area */
  width?: number;
  /** Height of focus area */
  height?: number;
}

export interface VignetteConfig {
  /** Enable vignette effect */
  enabled?: boolean;
  /** Offset from center (0-1) */
  offset?: number;
  /** Darkness at edges (0-1) */
  darkness?: number;
  /** Blend function */
  blendFunction?: BlendFunction;
}

export interface ChromaticAberrationConfig {
  /** Enable chromatic aberration effect */
  enabled?: boolean;
  /** Offset vector for aberration */
  offset?: [number, number];
  /** Radial modulation */
  radialModulation?: boolean;
  /** Modulation offset */
  modulationOffset?: number;
}

export interface NoiseConfig {
  /** Enable noise effect */
  enabled?: boolean;
  /** Noise opacity (0-1) */
  opacity?: number;
  /** Blend function */
  blendFunction?: BlendFunction;
}

export interface OutlineConfig {
  /** Enable outline effect */
  enabled?: boolean;
  /** Blur passes */
  blur?: boolean;
  /** Edge strength */
  edgeStrength?: number;
  /** Pulse speed (0 for no pulse) */
  pulseSpeed?: number;
  /** Visible edge color */
  visibleEdgeColor?: string;
  /** Hidden edge color */
  hiddenEdgeColor?: string;
  /** Width of outline */
  width?: number;
  /** Height of outline */
  height?: number;
  /** X resolution */
  xRay?: boolean;
  /** Kernel size */
  kernelSize?: KernelSize;
}

export interface EffectsConfig {
  /** Enable all effects */
  enabled?: boolean;
  /** Bloom configuration */
  bloom?: BloomConfig;
  /** SSAO configuration */
  ssao?: SSAOConfig;
  /** Depth of field configuration */
  dof?: DOFConfig;
  /** Vignette configuration */
  vignette?: VignetteConfig;
  /** Chromatic aberration configuration */
  chromaticAberration?: ChromaticAberrationConfig;
  /** Noise configuration */
  noise?: NoiseConfig;
  /** Outline configuration */
  outline?: OutlineConfig;
  /** Multisampling level */
  multisampling?: number;
  /** Stencil buffer */
  stencilBuffer?: boolean;
  /** Depth buffer */
  depthBuffer?: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  enabled: false,
  intensity: 1,
  luminanceThreshold: 0.9,
  luminanceSmoothing: 0.025,
  kernelSize: KernelSize.LARGE,
  mipmapBlur: true,
  radius: 0.4,
};

export const DEFAULT_SSAO_CONFIG: SSAOConfig = {
  enabled: false,
  intensity: 1.5,
  radius: 0.3,
  samples: 16,
  bias: 0.025,
  rings: 4,
  distanceThreshold: 1.0,
  distanceFalloff: 0.0,
  rangeThreshold: 0.5,
  rangeFalloff: 0.1,
  luminanceInfluence: 0.9,
  resolutionScale: 1,
};

export const DEFAULT_DOF_CONFIG: DOFConfig = {
  enabled: false,
  focusDistance: 0,
  focalLength: 0.02,
  bokehScale: 2,
  width: Resolution.AUTO_SIZE,
  height: Resolution.AUTO_SIZE,
};

export const DEFAULT_VIGNETTE_CONFIG: VignetteConfig = {
  enabled: false,
  offset: 0.3,
  darkness: 0.5,
  blendFunction: BlendFunction.NORMAL,
};

export const DEFAULT_CHROMATIC_ABERRATION_CONFIG: ChromaticAberrationConfig = {
  enabled: false,
  offset: [0.002, 0.002],
  radialModulation: false,
  modulationOffset: 0.15,
};

export const DEFAULT_NOISE_CONFIG: NoiseConfig = {
  enabled: false,
  opacity: 0.02,
  blendFunction: BlendFunction.OVERLAY,
};

export const DEFAULT_OUTLINE_CONFIG: OutlineConfig = {
  enabled: false,
  blur: true,
  edgeStrength: 2.5,
  pulseSpeed: 0,
  visibleEdgeColor: '#ffffff',
  hiddenEdgeColor: '#190a05',
  width: Resolution.AUTO_SIZE,
  height: Resolution.AUTO_SIZE,
  xRay: true,
  kernelSize: KernelSize.SMALL,
};

// ============================================================================
// useEffects Hook
// ============================================================================

export interface UseEffectsResult {
  /** Current effects configuration */
  config: EffectsConfig;
  /** Update configuration */
  updateConfig: (updates: Partial<EffectsConfig>) => void;
  /** Enable specific effect */
  enableEffect: (effect: keyof EffectsConfig) => void;
  /** Disable specific effect */
  disableEffect: (effect: keyof EffectsConfig) => void;
  /** Toggle specific effect */
  toggleEffect: (effect: keyof EffectsConfig) => void;
  /** Enable all effects */
  enableAll: () => void;
  /** Disable all effects */
  disableAll: () => void;
  /** Reset to default configuration */
  resetConfig: () => void;
  /** Get effect enabled state */
  isEffectEnabled: (effect: keyof EffectsConfig) => boolean;
}

export function useEffects(initialConfig: EffectsConfig = {}): UseEffectsResult {
  const sceneConfig = useThreeStore((state) => state.sceneConfig);

  const defaultConfig = useMemo(
    () => ({
      enabled: true,
      bloom: { ...DEFAULT_BLOOM_CONFIG },
      ssao: { ...DEFAULT_SSAO_CONFIG },
      dof: { ...DEFAULT_DOF_CONFIG },
      vignette: { ...DEFAULT_VIGNETTE_CONFIG },
      chromaticAberration: { ...DEFAULT_CHROMATIC_ABERRATION_CONFIG },
      noise: { ...DEFAULT_NOISE_CONFIG },
      outline: { ...DEFAULT_OUTLINE_CONFIG },
      multisampling: 8,
      stencilBuffer: true,
      depthBuffer: true,
    }),
    []
  );

  const [config, setConfig] = useState<EffectsConfig>(() => ({
    ...defaultConfig,
    ...initialConfig,
  }));

  const updateConfig = useCallback((updates: Partial<EffectsConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      Object.keys(updates).forEach((key) => {
        const k = key as keyof EffectsConfig;
        if (typeof updates[k] === 'object' && updates[k] !== null) {
          (newConfig[k] as object) = { ...(prev[k] as object), ...(updates[k] as object) };
        } else {
          (newConfig[k] as unknown) = updates[k];
        }
      });
      return newConfig;
    });
  }, []);

  const enableEffect = useCallback((effect: keyof EffectsConfig) => {
    updateConfig({ [effect]: { enabled: true } } as Partial<EffectsConfig>);
  }, [updateConfig]);

  const disableEffect = useCallback((effect: keyof EffectsConfig) => {
    updateConfig({ [effect]: { enabled: false } } as Partial<EffectsConfig>);
  }, [updateConfig]);

  const toggleEffect = useCallback((effect: keyof EffectsConfig) => {
    setConfig((prev) => {
      const effectConfig = prev[effect];
      if (typeof effectConfig === 'object' && effectConfig !== null && 'enabled' in effectConfig) {
        return {
          ...prev,
          [effect]: { ...effectConfig, enabled: !effectConfig.enabled },
        };
      }
      return prev;
    });
  }, []);

  const enableAll = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      enabled: true,
      bloom: { ...prev.bloom, enabled: true },
      ssao: { ...prev.ssao, enabled: true },
      dof: { ...prev.dof, enabled: true },
      vignette: { ...prev.vignette, enabled: true },
      chromaticAberration: { ...prev.chromaticAberration, enabled: true },
      noise: { ...prev.noise, enabled: true },
      outline: { ...prev.outline, enabled: true },
    }));
  }, []);

  const disableAll = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      enabled: false,
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, [defaultConfig]);

  const isEffectEnabled = useCallback(
    (effect: keyof EffectsConfig) => {
      const effectConfig = config[effect];
      if (typeof effectConfig === 'object' && effectConfig !== null && 'enabled' in effectConfig) {
        return effectConfig.enabled === true && config.enabled !== false;
      }
      return false;
    },
    [config]
  );

  // Sync with global store
  useEffect(() => {
    if (!sceneConfig.postProcessing) {
      setConfig((prev) => ({ ...prev, enabled: false }));
    }
  }, [sceneConfig.postProcessing]);

  return {
    config,
    updateConfig,
    enableEffect,
    disableEffect,
    toggleEffect,
    enableAll,
    disableAll,
    resetConfig,
    isEffectEnabled,
  };
}

// ============================================================================
// useOutlineSelection Hook
// ============================================================================

export interface UseOutlineSelectionResult {
  /** Selected objects for outline */
  selection: THREE.Object3D[];
  /** Add object to selection */
  addToOutline: (object: THREE.Object3D) => void;
  /** Remove object from selection */
  removeFromOutline: (object: THREE.Object3D) => void;
  /** Clear all outlines */
  clearOutline: () => void;
  /** Set outline selection */
  setOutlineSelection: (objects: THREE.Object3D[]) => void;
}

export function useOutlineSelection(): UseOutlineSelectionResult {
  const [selection, setSelection] = useState<THREE.Object3D[]>([]);

  const addToOutline = useCallback((object: THREE.Object3D) => {
    setSelection((prev) => {
      if (prev.includes(object)) return prev;
      return [...prev, object];
    });
  }, []);

  const removeFromOutline = useCallback((object: THREE.Object3D) => {
    setSelection((prev) => prev.filter((obj) => obj !== object));
  }, []);

  const clearOutline = useCallback(() => {
    setSelection([]);
  }, []);

  const setOutlineSelection = useCallback((objects: THREE.Object3D[]) => {
    setSelection(objects);
  }, []);

  return {
    selection,
    addToOutline,
    removeFromOutline,
    clearOutline,
    setOutlineSelection,
  };
}

// ============================================================================
// Effects Component Props
// ============================================================================

export interface EffectsProps {
  /** Effects configuration */
  config?: EffectsConfig;
  /** Outlined objects */
  outlineSelection?: THREE.Object3D[];
  /** Children (custom effects) */
  children?: React.ReactNode;
}

// ============================================================================
// Effects Component
// ============================================================================

export function Effects({
  config = {},
  outlineSelection = [],
  children,
}: EffectsProps) {
  const { gl, scene, camera } = useThree();
  const sceneConfig = useThreeStore((state) => state.sceneConfig);

  // Merge with defaults
  const effectsConfig = useMemo(
    () => ({
      enabled: config.enabled ?? true,
      bloom: { ...DEFAULT_BLOOM_CONFIG, ...config.bloom },
      ssao: { ...DEFAULT_SSAO_CONFIG, ...config.ssao },
      dof: { ...DEFAULT_DOF_CONFIG, ...config.dof },
      vignette: { ...DEFAULT_VIGNETTE_CONFIG, ...config.vignette },
      chromaticAberration: {
        ...DEFAULT_CHROMATIC_ABERRATION_CONFIG,
        ...config.chromaticAberration,
      },
      noise: { ...DEFAULT_NOISE_CONFIG, ...config.noise },
      outline: { ...DEFAULT_OUTLINE_CONFIG, ...config.outline },
      multisampling: config.multisampling ?? 8,
      stencilBuffer: config.stencilBuffer ?? false,
      depthBuffer: config.depthBuffer ?? true,
    }),
    [config]
  );

  // Don't render if effects are disabled globally
  if (!effectsConfig.enabled || !sceneConfig.postProcessing) {
    return null;
  }

  return React.createElement(
    EffectComposer,
    {
      multisampling: effectsConfig.multisampling,
      stencilBuffer: effectsConfig.stencilBuffer,
      depthBuffer: effectsConfig.depthBuffer,
    } as any,
    [
      // Bloom
      effectsConfig.bloom.enabled &&
        React.createElement(Bloom, {
          key: 'bloom',
          intensity: effectsConfig.bloom.intensity,
          luminanceThreshold: effectsConfig.bloom.luminanceThreshold,
          luminanceSmoothing: effectsConfig.bloom.luminanceSmoothing,
          kernelSize: effectsConfig.bloom.kernelSize,
          mipmapBlur: effectsConfig.bloom.mipmapBlur,
          radius: effectsConfig.bloom.radius,
        }),

      // SSAO - Note: SSAO from postprocessing may need different import
      // Using simplified version here
      effectsConfig.ssao.enabled &&
        React.createElement(SSAO, {
          key: 'ssao',
          intensity: effectsConfig.ssao.intensity,
          radius: effectsConfig.ssao.radius,
          samples: effectsConfig.ssao.samples,
          rings: effectsConfig.ssao.rings,
          distanceThreshold: effectsConfig.ssao.distanceThreshold,
          distanceFalloff: effectsConfig.ssao.distanceFalloff,
          rangeThreshold: effectsConfig.ssao.rangeThreshold,
          rangeFalloff: effectsConfig.ssao.rangeFalloff,
          luminanceInfluence: effectsConfig.ssao.luminanceInfluence,
        } as any),

      // Depth of Field
      effectsConfig.dof.enabled &&
        React.createElement(DepthOfField, {
          key: 'dof',
          focusDistance: effectsConfig.dof.focusDistance,
          focalLength: effectsConfig.dof.focalLength,
          bokehScale: effectsConfig.dof.bokehScale,
          width: effectsConfig.dof.width,
          height: effectsConfig.dof.height,
        }),

      // Outline for selection
      effectsConfig.outline.enabled &&
        outlineSelection.length > 0 &&
        React.createElement(Outline, {
          key: 'outline',
          selection: outlineSelection,
          blur: effectsConfig.outline.blur,
          edgeStrength: effectsConfig.outline.edgeStrength,
          pulseSpeed: effectsConfig.outline.pulseSpeed,
          visibleEdgeColor: new THREE.Color(effectsConfig.outline.visibleEdgeColor).getHex(),
          hiddenEdgeColor: new THREE.Color(effectsConfig.outline.hiddenEdgeColor).getHex(),
          width: effectsConfig.outline.width,
          height: effectsConfig.outline.height,
          xRay: effectsConfig.outline.xRay ?? true,
          kernelSize: effectsConfig.outline.kernelSize,
        }),

      // Chromatic Aberration
      effectsConfig.chromaticAberration.enabled &&
        React.createElement(ChromaticAberration, {
          key: 'chromaticAberration',
          offset: new THREE.Vector2(
            effectsConfig.chromaticAberration.offset?.[0] ?? 0.002,
            effectsConfig.chromaticAberration.offset?.[1] ?? 0.002
          ),
          radialModulation: effectsConfig.chromaticAberration.radialModulation ?? false,
          modulationOffset: effectsConfig.chromaticAberration.modulationOffset ?? 0,
        }),

      // Vignette
      effectsConfig.vignette.enabled &&
        React.createElement(Vignette, {
          key: 'vignette',
          offset: effectsConfig.vignette.offset,
          darkness: effectsConfig.vignette.darkness,
          blendFunction: effectsConfig.vignette.blendFunction,
        }),

      // Noise
      effectsConfig.noise.enabled &&
        React.createElement(Noise, {
          key: 'noise',
          opacity: effectsConfig.noise.opacity,
          blendFunction: effectsConfig.noise.blendFunction,
        }),

      // Custom effects
      children,
    ].filter(Boolean)
  );
}

// ============================================================================
// Selective Bloom Component
// ============================================================================

export interface SelectiveBloomProps {
  /** Objects to apply bloom to */
  selection?: THREE.Object3D[];
  /** Bloom intensity */
  intensity?: number;
  /** Luminance threshold */
  luminanceThreshold?: number;
  /** Luminance smoothing */
  luminanceSmoothing?: number;
  /** Kernel size */
  kernelSize?: KernelSize;
}

export function SelectiveBloomEffect({
  selection = [],
  intensity = 1,
  luminanceThreshold = 0.9,
  luminanceSmoothing = 0.025,
  kernelSize = KernelSize.LARGE,
}: SelectiveBloomProps) {
  if (selection.length === 0) return null;

  return React.createElement(SelectiveBloom, {
    selection,
    intensity,
    luminanceThreshold,
    luminanceSmoothing,
    kernelSize,
  });
}

// ============================================================================
// Effect Presets
// ============================================================================

export const effectPresets = {
  /** Default minimal effects */
  minimal: {
    enabled: true,
    bloom: { enabled: false },
    ssao: { enabled: false },
    dof: { enabled: false },
    vignette: { enabled: true, offset: 0.3, darkness: 0.3 },
    chromaticAberration: { enabled: false },
    noise: { enabled: false },
    outline: { enabled: true },
  } as EffectsConfig,

  /** Cinematic look */
  cinematic: {
    enabled: true,
    bloom: { enabled: true, intensity: 0.5, luminanceThreshold: 0.8 },
    ssao: { enabled: true, intensity: 1 },
    dof: { enabled: true, focusDistance: 0.01, focalLength: 0.02, bokehScale: 3 },
    vignette: { enabled: true, offset: 0.25, darkness: 0.6 },
    chromaticAberration: { enabled: true, offset: [0.001, 0.001] },
    noise: { enabled: true, opacity: 0.03 },
    outline: { enabled: false },
  } as EffectsConfig,

  /** High contrast for data visualization */
  dataViz: {
    enabled: true,
    bloom: { enabled: true, intensity: 1, luminanceThreshold: 0.95 },
    ssao: { enabled: true, intensity: 0.8 },
    dof: { enabled: false },
    vignette: { enabled: true, offset: 0.4, darkness: 0.4 },
    chromaticAberration: { enabled: false },
    noise: { enabled: false },
    outline: { enabled: true, edgeStrength: 3, visibleEdgeColor: '#00ff00' },
  } as EffectsConfig,

  /** Stylized/artistic look */
  stylized: {
    enabled: true,
    bloom: { enabled: true, intensity: 2, luminanceThreshold: 0.5 },
    ssao: { enabled: false },
    dof: { enabled: false },
    vignette: { enabled: true, offset: 0.2, darkness: 0.7 },
    chromaticAberration: { enabled: true, offset: [0.003, 0.003] },
    noise: { enabled: true, opacity: 0.05 },
    outline: { enabled: true, edgeStrength: 4 },
  } as EffectsConfig,

  /** Performance-focused (minimal effects) */
  performance: {
    enabled: true,
    bloom: { enabled: false },
    ssao: { enabled: false },
    dof: { enabled: false },
    vignette: { enabled: false },
    chromaticAberration: { enabled: false },
    noise: { enabled: false },
    outline: { enabled: true },
    multisampling: 0,
  } as EffectsConfig,
};

// ============================================================================
// Exports
// ============================================================================


