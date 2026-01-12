/**
 * Three.js Performance Optimization
 *
 * Comprehensive performance utilities including LOD, instancing,
 * culling, and budget monitoring for optimal 3D rendering.
 *
 * @module lib/three/performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

export interface LODLevel {
  /** Distance at which this LOD level activates */
  distance: number;
  /** The 3D object for this level (or null for invisible) */
  object: THREE.Object3D | null;
}

export interface LODOptions {
  /** Update frequency (frames to skip between updates) */
  updateFrequency?: number;
  /** Hysteresis to prevent LOD flickering */
  hysteresis?: number;
  /** Whether to automatically dispose of objects when not in use */
  autoDispose?: boolean;
}

export interface LODResult {
  /** Current LOD level index */
  currentLevel: number;
  /** Current distance from camera */
  distance: number;
  /** LOD group reference */
  lodRef: React.RefObject<THREE.LOD>;
  /** Force update LOD */
  forceUpdate: () => void;
}

export interface InstancesOptions {
  /** Maximum number of instances */
  maxCount?: number;
  /** Enable frustum culling per instance */
  frustumCulled?: boolean;
  /** Instance color support */
  enableColors?: boolean;
  /** Update mode ('static' | 'dynamic') */
  updateMode?: 'static' | 'dynamic';
}

interface SimplifiedVector3 {
  x: number;
  y: number;
  z: number;
}

export interface InstanceTransform {
  /** Position */
  position?: SimplifiedVector3;
  /** Rotation (Euler) */
  rotation?: SimplifiedVector3;
  /** Scale */
  scale?: SimplifiedVector3 | number;
  /** Color (if enabled) */
  color?: THREE.ColorRepresentation;
  /** User data */
  userData?: Record<string, unknown>;
}

export interface InstancesResult {
  /** InstancedMesh reference */
  meshRef: React.RefObject<THREE.InstancedMesh>;
  /** Update a single instance */
  updateInstance: (index: number, transform: InstanceTransform) => void;
  /** Update multiple instances */
  updateInstances: (transforms: InstanceTransform[], startIndex?: number) => void;
  /** Set instance count */
  setCount: (count: number) => void;
  /** Get instance at index */
  getInstance: (index: number) => InstanceTransform | null;
  /** Current instance count */
  count: number;
}

export interface CullingOptions {
  /** Enable culling */
  enabled?: boolean;
  /** Update frequency */
  updateFrequency?: number;
  /** Margin outside frustum to keep objects visible */
  margin?: number;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
}

export interface CullingResult {
  /** Whether object is visible */
  isVisible: boolean;
  /** Force visibility update */
  update: () => void;
}

export interface PerformanceBudget {
  /** Target FPS */
  targetFPS: number;
  /** Maximum draw calls */
  maxDrawCalls: number;
  /** Maximum triangles */
  maxTriangles: number;
  /** Maximum texture memory (bytes) */
  maxTextureMemory?: number;
  /** Maximum geometry memory (bytes) */
  maxGeometryMemory?: number;
}

export interface PerformanceMetrics {
  /** Current FPS */
  fps: number;
  /** Current draw calls */
  drawCalls: number;
  /** Current triangle count */
  triangles: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Texture memory usage (bytes) */
  textureMemory: number;
  /** Geometry memory usage (bytes) */
  geometryMemory: number;
  /** Programs count */
  programs: number;
  /** Textures count */
  textures: number;
  /** Geometries count */
  geometries: number;
}

export interface BudgetStatus {
  /** Whether within budget */
  isWithinBudget: boolean;
  /** Individual budget checks */
  checks: {
    fps: boolean;
    drawCalls: boolean;
    triangles: boolean;
    textureMemory: boolean;
    geometryMemory: boolean;
  };
  /** Warnings for exceeded budgets */
  warnings: string[];
  /** Current metrics */
  metrics: PerformanceMetrics;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_BUDGET: PerformanceBudget = {
  targetFPS: 60,
  maxDrawCalls: 500,
  maxTriangles: 500000,
  maxTextureMemory: 256 * 1024 * 1024, // 256MB
  maxGeometryMemory: 128 * 1024 * 1024, // 128MB
};

// ============================================================================
// useLOD Hook
// ============================================================================

export function useLOD(
  levels: LODLevel[],
  options: LODOptions = {}
): LODResult {
  const { updateFrequency = 1, hysteresis = 0.1, autoDispose = true } = options;

  const { camera } = useThree();
  const lodRef = useRef<THREE.LOD>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [distance, setDistance] = useState(0);
  const frameCount = useRef(0);
  const previousLevel = useRef(0);

  // Create LOD object with levels
  useEffect(() => {
    if (!lodRef.current) return;

    const lod = lodRef.current;

    // Clear existing levels
    while (lod.children.length > 0) {
      const child = lod.children[0];
      lod.remove(child);
      if (autoDispose && child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    // Add new levels
    levels.forEach((level) => {
      if (level.object) {
        lod.addLevel(level.object, level.distance);
      }
    });

    // Update immediately
    lod.update(camera);
  }, [levels, camera, autoDispose]);

  useFrame(() => {
    if (!lodRef.current) return;

    frameCount.current++;
    if (frameCount.current % updateFrequency !== 0) return;

    const lod = lodRef.current;

    // Calculate distance to camera
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);

    const lodWorldPos = new THREE.Vector3();
    lod.getWorldPosition(lodWorldPos);

    const dist = cameraWorldPos.distanceTo(lodWorldPos);
    setDistance(dist);

    // Determine current level with hysteresis
    let newLevel = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
      const levelDistance = levels[i].distance;
      const threshold =
        i === previousLevel.current
          ? levelDistance * (1 + hysteresis)
          : levelDistance;

      if (dist >= threshold) {
        newLevel = i;
        break;
      }
    }

    if (newLevel !== previousLevel.current) {
      previousLevel.current = newLevel;
      setCurrentLevel(newLevel);
    }

    lod.update(camera);
  });

  const forceUpdate = useCallback(() => {
    if (lodRef.current) {
      lodRef.current.update(camera);
    }
  }, [camera]);

  return {
    currentLevel,
    distance,
    lodRef,
    forceUpdate,
  };
}

// ============================================================================
// useInstances Hook
// ============================================================================

export function useInstances(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  transforms: InstanceTransform[],
  options: InstancesOptions = {}
): InstancesResult {
  const {
    maxCount = transforms.length,
    frustumCulled = true,
    enableColors = false,
    updateMode = 'static',
  } = options;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [count, setCount] = useState(transforms.length);
  const transformMatrixRef = useRef(new THREE.Matrix4());
  const positionRef = useRef(new THREE.Vector3());
  const rotationRef = useRef(new THREE.Euler());
  const quaternionRef = useRef(new THREE.Quaternion());
  const scaleRef = useRef(new THREE.Vector3());
  const colorRef = useRef(new THREE.Color());

  // Initialize instances
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    mesh.count = Math.min(transforms.length, maxCount);
    mesh.frustumCulled = frustumCulled;

    // Set up instance matrices and colors
    transforms.forEach((transform, index) => {
      if (index >= maxCount) return;

      const pos = transform.position;
      const rot = transform.rotation ?? { x: 0, y: 0, z: 0 };
      const scl = transform.scale ?? 1;

      if (pos) positionRef.current.set(pos.x, pos.y, pos.z);
      rotationRef.current.set(rot.x, rot.y, rot.z);
      quaternionRef.current.setFromEuler(rotationRef.current);

      if (typeof scl === 'number') {
        scaleRef.current.set(scl, scl, scl);
      } else {
        scaleRef.current.set(scl.x, scl.y, scl.z);
      }

      transformMatrixRef.current.compose(
        positionRef.current,
        quaternionRef.current,
        scaleRef.current
      );

      mesh.setMatrixAt(index, transformMatrixRef.current);

      if (enableColors && transform.color) {
        colorRef.current.set(transform.color);
        mesh.setColorAt(index, colorRef.current);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (enableColors && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [transforms, maxCount, frustumCulled, enableColors]);

  const updateInstance = useCallback(
    (index: number, transform: InstanceTransform) => {
      if (!meshRef.current || index >= maxCount) return;

      const mesh = meshRef.current;
      const pos = transform.position;
      const rot = transform.rotation ?? { x: 0, y: 0, z: 0 };
      const scl = transform.scale ?? 1;

      if (pos) positionRef.current.set(pos.x, pos.y, pos.z);
      rotationRef.current.set(rot.x, rot.y, rot.z);
      quaternionRef.current.setFromEuler(rotationRef.current);

      if (typeof scl === 'number') {
        scaleRef.current.set(scl, scl, scl);
      } else {
        scaleRef.current.set(scl.x, scl.y, scl.z);
      }

      transformMatrixRef.current.compose(
        positionRef.current,
        quaternionRef.current,
        scaleRef.current
      );

      mesh.setMatrixAt(index, transformMatrixRef.current);
      mesh.instanceMatrix.needsUpdate = true;

      if (enableColors && transform.color) {
        colorRef.current.set(transform.color);
        mesh.setColorAt(index, colorRef.current);
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
    },
    [maxCount, enableColors]
  );

  const updateInstances = useCallback(
    (newTransforms: InstanceTransform[], startIndex: number = 0) => {
      newTransforms.forEach((transform, i) => {
        updateInstance(startIndex + i, transform);
      });
    },
    [updateInstance]
  );

  const setCountFn = useCallback(
    (newCount: number) => {
      if (!meshRef.current) return;
      const clampedCount = Math.min(newCount, maxCount);
      meshRef.current.count = clampedCount;
      setCount(clampedCount);
    },
    [maxCount]
  );

  const getInstance = useCallback(
    (index: number): InstanceTransform | null => {
      if (!meshRef.current || index >= count) return null;

      const matrix = new THREE.Matrix4();
      meshRef.current.getMatrixAt(index, matrix);

      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, quaternion, scale);

      const euler = new THREE.Euler().setFromQuaternion(quaternion);

      let color: THREE.ColorRepresentation | undefined;
      if (enableColors && meshRef.current.instanceColor) {
        const c = new THREE.Color();
        meshRef.current.getColorAt(index, c);
        color = c.getHex();
      }

      return {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: euler.x, y: euler.y, z: euler.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
        color,
      };
    },
    [count, enableColors]
  );

  return {
    meshRef,
    updateInstance,
    updateInstances,
    setCount: setCountFn,
    getInstance,
    count,
  };
}

// ============================================================================
// useOcclusionCulling Hook
// ============================================================================

export function useOcclusionCulling(
  objectRef: React.RefObject<THREE.Object3D>,
  options: CullingOptions = {}
): CullingResult {
  const {
    enabled = true,
    updateFrequency = 3,
    margin = 0,
    onVisibilityChange,
  } = options;

  const { camera, gl, scene } = useThree();
  const [isVisible, setIsVisible] = useState(true);
  const frameCount = useRef(0);
  const previousVisible = useRef(true);
  const raycaster = useRef(new THREE.Raycaster());
  const occluders = useRef<THREE.Object3D[]>([]);

  // Find potential occluders in scene
  useEffect(() => {
    if (!enabled) return;

    const collectOccluders = () => {
      occluders.current = [];
      scene.traverse((obj) => {
        if (
          obj !== objectRef.current &&
          obj instanceof THREE.Mesh &&
          obj.userData.occluder !== false
        ) {
          occluders.current.push(obj);
        }
      });
    };

    collectOccluders();
  }, [enabled, scene, objectRef]);

  useFrame(() => {
    if (!enabled || !objectRef.current) return;

    frameCount.current++;
    if (frameCount.current % updateFrequency !== 0) return;

    const object = objectRef.current;

    // Get object center in world space
    const objectCenter = new THREE.Vector3();
    if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
      object.geometry.boundingSphere.center.clone();
      object.localToWorld(objectCenter);
    } else {
      object.getWorldPosition(objectCenter);
    }

    // Get camera position
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Direction from camera to object
    const direction = new THREE.Vector3()
      .subVectors(objectCenter, cameraPos)
      .normalize();

    // Distance to object
    const distance = cameraPos.distanceTo(objectCenter);

    // Cast ray to check for occluders
    raycaster.current.set(cameraPos, direction);
    raycaster.current.far = distance;

    const intersects = raycaster.current.intersectObjects(
      occluders.current,
      true
    );

    // Object is visible if no occluders or closest occluder is behind object
    const visible = intersects.length === 0 || intersects[0].distance >= distance - margin;

    if (visible !== previousVisible.current) {
      previousVisible.current = visible;
      setIsVisible(visible);
      object.visible = visible;
      onVisibilityChange?.(visible);
    }
  });

  const update = useCallback(() => {
    frameCount.current = 0;
  }, []);

  return {
    isVisible,
    update,
  };
}

// ============================================================================
// useFrustumCulling Hook
// ============================================================================

export function useFrustumCulling(
  objectRef: React.RefObject<THREE.Object3D>,
  options: CullingOptions = {}
): CullingResult {
  const {
    enabled = true,
    updateFrequency = 1,
    margin = 0.1,
    onVisibilityChange,
  } = options;

  const { camera } = useThree();
  const [isVisible, setIsVisible] = useState(true);
  const frameCount = useRef(0);
  const previousVisible = useRef(true);
  const frustum = useRef(new THREE.Frustum());
  const projScreenMatrix = useRef(new THREE.Matrix4());
  const boundingSphere = useRef(new THREE.Sphere());
  const boundingBox = useRef(new THREE.Box3());

  useFrame(() => {
    if (!enabled || !objectRef.current) return;

    frameCount.current++;
    if (frameCount.current % updateFrequency !== 0) return;

    const object = objectRef.current;

    // Update frustum from camera
    projScreenMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.current.setFromProjectionMatrix(projScreenMatrix.current);

    // Get bounding sphere or box
    let visible = true;

    if (object instanceof THREE.Mesh && object.geometry) {
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      if (object.geometry.boundingSphere) {
        boundingSphere.current.copy(object.geometry.boundingSphere);
        boundingSphere.current.applyMatrix4(object.matrixWorld);
        boundingSphere.current.radius *= 1 + margin;
        visible = frustum.current.intersectsSphere(boundingSphere.current);
      }
    } else {
      // Use bounding box for groups/other objects
      boundingBox.current.setFromObject(object);
      boundingBox.current.expandByScalar(margin);
      visible = frustum.current.intersectsBox(boundingBox.current);
    }

    if (visible !== previousVisible.current) {
      previousVisible.current = visible;
      setIsVisible(visible);
      object.visible = visible;
      onVisibilityChange?.(visible);
    }
  });

  const update = useCallback(() => {
    frameCount.current = 0;
  }, []);

  return {
    isVisible,
    update,
  };
}

// ============================================================================
// usePerformanceBudget Hook
// ============================================================================

export function usePerformanceBudget(
  budget: PerformanceBudget = DEFAULT_BUDGET
): BudgetStatus {
  const { gl } = useThree();
  const updatePerformanceMetrics = useThreeStore(
    (state) => state.updatePerformanceMetrics
  );

  const [status, setStatus] = useState<BudgetStatus>({
    isWithinBudget: true,
    checks: {
      fps: true,
      drawCalls: true,
      triangles: true,
      textureMemory: true,
      geometryMemory: true,
    },
    warnings: [],
    metrics: {
      fps: 60,
      drawCalls: 0,
      triangles: 0,
      frameTime: 0,
      textureMemory: 0,
      geometryMemory: 0,
      programs: 0,
      textures: 0,
      geometries: 0,
    },
  });

  const fpsHistory = useRef<number[]>([]);
  const lastTime = useRef(performance.now());
  const frameCount = useRef(0);

  useFrame(() => {
    frameCount.current++;

    // Update FPS calculation every 30 frames
    if (frameCount.current % 30 === 0) {
      const now = performance.now();
      const delta = now - lastTime.current;
      const fps = (30 * 1000) / delta;
      lastTime.current = now;

      // Keep last 10 FPS measurements for averaging
      fpsHistory.current.push(fps);
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift();
      }
    }

    // Update metrics every 60 frames
    if (frameCount.current % 60 === 0) {
      const info = gl.info;
      const avgFps =
        fpsHistory.current.length > 0
          ? fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
          : 60;

      const metrics: PerformanceMetrics = {
        fps: Math.round(avgFps),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        frameTime: 1000 / avgFps,
        textureMemory: info.memory.textures * 1024 * 1024, // Estimate
        geometryMemory: info.memory.geometries * 1024 * 1024, // Estimate
        programs: info.programs?.length ?? 0,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
      };

      // Update store
      updatePerformanceMetrics(metrics.fps, metrics.drawCalls, metrics.triangles);

      // Check budget
      const checks = {
        fps: metrics.fps >= budget.targetFPS * 0.9, // Allow 10% tolerance
        drawCalls: metrics.drawCalls <= budget.maxDrawCalls,
        triangles: metrics.triangles <= budget.maxTriangles,
        textureMemory: budget.maxTextureMemory
          ? metrics.textureMemory <= budget.maxTextureMemory
          : true,
        geometryMemory: budget.maxGeometryMemory
          ? metrics.geometryMemory <= budget.maxGeometryMemory
          : true,
      };

      const warnings: string[] = [];
      if (!checks.fps) {
        warnings.push(
          `FPS (${metrics.fps}) below target (${budget.targetFPS})`
        );
      }
      if (!checks.drawCalls) {
        warnings.push(
          `Draw calls (${metrics.drawCalls}) exceed budget (${budget.maxDrawCalls})`
        );
      }
      if (!checks.triangles) {
        warnings.push(
          `Triangles (${metrics.triangles}) exceed budget (${budget.maxTriangles})`
        );
      }
      if (!checks.textureMemory) {
        warnings.push(`Texture memory exceeds budget`);
      }
      if (!checks.geometryMemory) {
        warnings.push(`Geometry memory exceeds budget`);
      }

      const isWithinBudget = Object.values(checks).every(Boolean);

      setStatus({
        isWithinBudget,
        checks,
        warnings,
        metrics,
      });
    }
  });

  return status;
}

// ============================================================================
// Performance Monitor Component Hook
// ============================================================================

export interface PerformanceMonitorOptions {
  /** Enable logging warnings */
  logWarnings?: boolean;
  /** Budget configuration */
  budget?: PerformanceBudget;
  /** Callback when budget exceeded */
  onBudgetExceeded?: (warnings: string[]) => void;
  /** Adaptive quality enabled */
  adaptiveQuality?: boolean;
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    logWarnings = process.env.NODE_ENV === 'development',
    budget = DEFAULT_BUDGET,
    onBudgetExceeded,
    adaptiveQuality = false,
  } = options;

  const status = usePerformanceBudget(budget);
  const { gl } = useThree();
  const updateSceneConfig = useThreeStore((state) => state.updateSceneConfig);

  // Log warnings
  useEffect(() => {
    if (logWarnings && status.warnings.length > 0) {
      console.warn('[Performance]', status.warnings.join('; '));
    }
  }, [logWarnings, status.warnings]);

  // Callback for budget exceeded
  useEffect(() => {
    if (!status.isWithinBudget && onBudgetExceeded) {
      onBudgetExceeded(status.warnings);
    }
  }, [status.isWithinBudget, status.warnings, onBudgetExceeded]);

  // Adaptive quality
  useEffect(() => {
    if (!adaptiveQuality) return;

    if (status.metrics.fps < budget.targetFPS * 0.7) {
      // Performance is poor, reduce quality
      const currentPixelRatio = gl.getPixelRatio();
      if (currentPixelRatio > 1) {
        gl.setPixelRatio(Math.max(1, currentPixelRatio - 0.25));
        updateSceneConfig({
          pixelRatio: gl.getPixelRatio(),
          shadows: false,
          postProcessing: false,
        });
      }
    } else if (
      status.metrics.fps >= budget.targetFPS * 0.95 &&
      status.isWithinBudget
    ) {
      // Performance is good, can try increasing quality
      const currentPixelRatio = gl.getPixelRatio();
      const maxPixelRatio = Math.min(2, window.devicePixelRatio);
      if (currentPixelRatio < maxPixelRatio) {
        gl.setPixelRatio(Math.min(maxPixelRatio, currentPixelRatio + 0.25));
        updateSceneConfig({
          pixelRatio: gl.getPixelRatio(),
        });
      }
    }
  }, [
    adaptiveQuality,
    status.metrics.fps,
    status.isWithinBudget,
    budget.targetFPS,
    gl,
    updateSceneConfig,
  ]);

  return status;
}

// ============================================================================
// Geometry Utilities
// ============================================================================

export function disposeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.dispose();

  // Dispose of associated attributes
  const attributes = geometry.attributes;
  for (const key in attributes) {
    const attribute = attributes[key];
    if (attribute && 'dispose' in attribute) {
      (attribute as THREE.BufferAttribute).array = new Float32Array(0);
    }
  }

  if (geometry.index) {
    geometry.index.array = new Uint16Array(0);
  }
}

export function disposeMaterial(
  material: THREE.Material | THREE.Material[]
): void {
  const materials = Array.isArray(material) ? material : [material];

  materials.forEach((mat) => {
    mat.dispose();

    // Dispose of textures
    const textureKeys = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'lightMap',
      'alphaMap',
      'envMap',
      'bumpMap',
      'displacementMap',
    ] as const;

    textureKeys.forEach((key) => {
      const texture = (mat as any)[key];
      if (texture instanceof THREE.Texture) {
        texture.dispose();
      }
    });
  });
}

export function disposeObject(object: THREE.Object3D, recursive = true): void {
  if (recursive) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          disposeGeometry(child.geometry);
        }
        if (child.material) {
          disposeMaterial(child.material);
        }
      }
    });
  } else if (object instanceof THREE.Mesh) {
    if (object.geometry) {
      disposeGeometry(object.geometry);
    }
    if (object.material) {
      disposeMaterial(object.material);
    }
  }

  // Remove from parent
  if (object.parent) {
    object.parent.remove(object);
  }
}

// ============================================================================
// Memory Management Hook
// ============================================================================

export interface MemoryStats {
  geometries: number;
  textures: number;
  programs: number;
  totalMemory: number;
}

export function useMemoryStats(): MemoryStats {
  const { gl } = useThree();
  const [stats, setStats] = useState<MemoryStats>({
    geometries: 0,
    textures: 0,
    programs: 0,
    totalMemory: 0,
  });

  useFrame(() => {
    const info = gl.info;
    setStats({
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      totalMemory:
        (info.memory.geometries + info.memory.textures) * 1024 * 1024, // Rough estimate
    });
  });

  return stats;
}

// ============================================================================
// Exports
// ============================================================================


