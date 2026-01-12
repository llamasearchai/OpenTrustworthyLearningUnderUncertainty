/**
 * Three.js Animations
 *
 * Comprehensive animation hooks for 3D objects including frame animations,
 * spring physics, float effects, rotation, following, and look-at behaviors.
 *
 * @module lib/three/animations
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useSpring, animated, config as springConfig } from '@react-spring/three';
import * as THREE from 'three';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

export type AnimationPreset = 'bounce' | 'pulse' | 'spin' | 'float' | 'shake';

export interface FrameAnimationOptions {
  /** Animation priority (higher runs later) */
  priority?: number;
  /** Whether animation is enabled */
  enabled?: boolean;
  /** Maximum delta time to prevent large jumps */
  maxDelta?: number;
}

export interface SpringAnimationConfig {
  /** Spring mass */
  mass?: number;
  /** Spring tension */
  tension?: number;
  /** Friction */
  friction?: number;
  /** Clamp to prevent overshoot */
  clamp?: boolean;
  /** Precision for completion */
  precision?: number;
}

export interface FloatOptions {
  /** Amplitude of float motion */
  amplitude?: number;
  /** Frequency of float motion */
  frequency?: number;
  /** Phase offset */
  phase?: number;
  /** Enabled state */
  enabled?: boolean;
}

export interface RotateOptions {
  /** Rotation axis */
  axis?: 'x' | 'y' | 'z';
  /** Rotation speed (radians per second) */
  speed?: number;
  /** Enabled state */
  enabled?: boolean;
}

export interface FollowOptions {
  /** Smooth time for lerping */
  smoothTime?: number;
  /** Maximum speed */
  maxSpeed?: number;
  /** Offset from target */
  offset?: { x: number; y: number; z: number };
  /** Enabled state */
  enabled?: boolean;
}

export interface LookAtOptions {
  /** Smooth transition time */
  smoothTime?: number;
  /** Up vector */
  up?: { x: number; y: number; z: number };
  /** Enabled state */
  enabled?: boolean;
}

export interface AnimationState {
  /** Current animation time */
  time: number;
  /** Animation progress (0-1) for looped animations */
  progress: number;
  /** Whether animation is playing */
  isPlaying: boolean;
  /** Play animation */
  play: () => void;
  /** Pause animation */
  pause: () => void;
  /** Stop animation (reset to start) */
  stop: () => void;
  /** Seek to specific time */
  seek: (time: number) => void;
}

// ============================================================================
// Reduced Motion Detection
// ============================================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// useFrameAnimation Hook
// ============================================================================

export function useFrameAnimation(
  callback: (state: { clock: THREE.Clock; delta: number; elapsed: number }) => void,
  options: FrameAnimationOptions = {}
): AnimationState {
  const { priority = 0, enabled = true, maxDelta = 0.1 } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const [isPlaying, setIsPlaying] = useState(true);
  const timeRef = useRef(0);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useFrame((state, delta) => {
    if (!enabled || !isPlaying || prefersReducedMotion) return;

    // Clamp delta to prevent large jumps
    const clampedDelta = Math.min(delta, maxDelta);
    timeRef.current += clampedDelta;

    callbackRef.current({
      clock: state.clock,
      delta: clampedDelta,
      elapsed: timeRef.current,
    });
  }, priority);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const stop = useCallback(() => {
    setIsPlaying(false);
    timeRef.current = 0;
  }, []);
  const seek = useCallback((time: number) => {
    timeRef.current = time;
  }, []);

  return {
    time: timeRef.current,
    progress: 0,
    isPlaying,
    play,
    pause,
    stop,
    seek,
  };
}

// ============================================================================
// useSpringAnimation Hook
// ============================================================================

export interface SpringAnimationResult<T extends object> {
  /** Spring values */
  spring: T;
  /** Spring API for controlling animation */
  api: {
    start: (to: Partial<T>) => void;
    stop: () => void;
    set: (values: Partial<T>) => void;
  };
  /** Whether animation is active */
  isAnimating: boolean;
}

export function useSpringAnimation<T extends object>(
  from: T,
  config: SpringAnimationConfig = {}
): SpringAnimationResult<T> {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isAnimating, setIsAnimating] = useState(false);

  // Adjust config for reduced motion
  const adjustedConfig = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        ...config,
        tension: 1000,
        friction: 100,
        clamp: true,
      };
    }
    return {
      mass: config.mass ?? 1,
      tension: config.tension ?? 170,
      friction: config.friction ?? 26,
      clamp: config.clamp ?? false,
      precision: config.precision ?? 0.01,
    };
  }, [config, prefersReducedMotion]);
  const [spring, springApi] = useSpring(() => ({
    from,
    config: adjustedConfig,
    onStart: () => setIsAnimating(true),
    onRest: () => setIsAnimating(false),
  })) as any;

  const api = springApi as any;

  const start = useCallback((to: Partial<T>) => {
    api.start(to);
  }, [api]);

  const stop = useCallback(() => {
    api.stop();
  }, [api]);

  const set = useCallback((values: Partial<T>) => {
    api.set(values);
  }, [api]);

  return {
    spring: spring as unknown as T,
    api: { start, stop, set },
    isAnimating,
  };
}

// ============================================================================
// useFloat Hook
// ============================================================================

export interface FloatResult {
  /** Animated Y position */
  y: number;
  /** Current phase of animation */
  phase: number;
  /** Reset animation */
  reset: () => void;
}

export function useFloat(options: FloatOptions = {}): FloatResult {
  const {
    amplitude = 0.5,
    frequency = 1,
    phase: initialPhase = 0,
    enabled = true,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const [y, setY] = useState(0);
  const [phase, setPhase] = useState(initialPhase);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!enabled || prefersReducedMotion) {
      setY(0);
      return;
    }

    timeRef.current += delta;
    const currentPhase = timeRef.current * frequency * Math.PI * 2 + initialPhase;
    const newY = Math.sin(currentPhase) * amplitude;

    setY(newY);
    setPhase(currentPhase % (Math.PI * 2));
  });

  const reset = useCallback(() => {
    timeRef.current = 0;
    setY(0);
    setPhase(initialPhase);
  }, [initialPhase]);

  return { y, phase, reset };
}

// ============================================================================
// useRotate Hook
// ============================================================================

export interface RotateResult {
  /** Current rotation value */
  rotation: number;
  /** Euler rotation object */
  euler: THREE.Euler;
  /** Reset rotation */
  reset: () => void;
}

export function useRotate(options: RotateOptions = {}): RotateResult {
  const {
    axis = 'y',
    speed = 1,
    enabled = true,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const [rotation, setRotation] = useState(0);
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame((_, delta) => {
    if (!enabled || prefersReducedMotion) return;

    setRotation((prev) => {
      const newRotation = prev + speed * delta;
      return newRotation % (Math.PI * 2);
    });
  });

  useEffect(() => {
    euler.set(
      axis === 'x' ? rotation : 0,
      axis === 'y' ? rotation : 0,
      axis === 'z' ? rotation : 0
    );
  }, [rotation, axis, euler]);

  const reset = useCallback(() => {
    setRotation(0);
    euler.set(0, 0, 0);
  }, [euler]);

  return { rotation, euler, reset };
}

// ============================================================================
// useFollow Hook
// ============================================================================

export interface FollowResult {
  /** Current position */
  position: THREE.Vector3;
  /** Apply position to object */
  apply: (object: THREE.Object3D) => void;
  /** Check if at target */
  isAtTarget: boolean;
}

export function useFollow(
  target: { x: number; y: number; z: number } | (() => { x: number; y: number; z: number }),
  options: FollowOptions = {}
): FollowResult {
  const {
    smoothTime = 0.3,
    maxSpeed = Infinity,
    offset = { x: 0, y: 0, z: 0 },
    enabled = true,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const position = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const [isAtTarget, setIsAtTarget] = useState(false);

  useFrame((_, delta) => {
    if (!enabled) return;

    const targetValue = typeof target === 'function' ? target() : target;
    const targetWithOffset = new THREE.Vector3(
      targetValue.x + offset.x,
      targetValue.y + offset.y,
      targetValue.z + offset.z
    );

    if (prefersReducedMotion) {
      // Instant movement for reduced motion
      position.current.copy(targetWithOffset);
      setIsAtTarget(true);
      return;
    }

    // Smooth damp towards target
    smoothDamp(
      position.current,
      targetWithOffset,
      velocity.current,
      smoothTime,
      maxSpeed,
      delta
    );

    const distance = position.current.distanceTo(targetWithOffset);
    setIsAtTarget(distance < 0.01);
  });

  const apply = useCallback((object: THREE.Object3D) => {
    object.position.copy(position.current);
  }, []);

  return {
    position: position.current,
    apply,
    isAtTarget,
  };
}

// Smooth damp helper function (similar to Unity's Vector3.SmoothDamp)
function smoothDamp(
  current: THREE.Vector3,
  target: THREE.Vector3,
  currentVelocity: THREE.Vector3,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number
): THREE.Vector3 {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const change = current.clone().sub(target);
  const originalTo = target.clone();

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  const maxChangeSq = maxChange * maxChange;
  const sqrmag = change.lengthSq();

  if (sqrmag > maxChangeSq) {
    change.multiplyScalar(maxChange / Math.sqrt(sqrmag));
  }

  const newTarget = current.clone().sub(change);
  const temp = currentVelocity.clone().add(change.clone().multiplyScalar(omega)).multiplyScalar(deltaTime);
  currentVelocity.sub(temp.clone().multiplyScalar(omega)).multiplyScalar(exp);

  let output = newTarget.add(change.add(temp).multiplyScalar(exp));

  // Prevent overshooting
  const origMinusCurrent = originalTo.sub(current);
  const outMinusOrig = output.clone().sub(originalTo);

  if (origMinusCurrent.dot(outMinusOrig) > 0) {
    output.copy(originalTo);
    currentVelocity.set(0, 0, 0);
  }

  current.copy(output);
  return current;
}

// ============================================================================
// useLookAt Hook
// ============================================================================

export interface LookAtResult {
  /** Current rotation quaternion */
  quaternion: THREE.Quaternion;
  /** Apply look-at to object */
  apply: (object: THREE.Object3D) => void;
  /** Whether currently looking at target */
  isLooking: boolean;
}

export function useLookAt(
  target: { x: number; y: number; z: number } | (() => { x: number; y: number; z: number }),
  options: LookAtOptions = {}
): LookAtResult {
  const {
    smoothTime = 0.1,
    up = { x: 0, y: 1, z: 0 },
    enabled = true,
  } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const quaternion = useRef(new THREE.Quaternion());
  const targetQuaternion = useRef(new THREE.Quaternion());
  const [isLooking, setIsLooking] = useState(false);
  const tempMatrix = useRef(new THREE.Matrix4());
  const upVector = useMemo(() => new THREE.Vector3(up.x, up.y, up.z), [up]);

  useFrame((state, delta) => {
    if (!enabled) return;

    const targetValue = typeof target === 'function' ? target() : target;
    const targetVector = new THREE.Vector3(targetValue.x, targetValue.y, targetValue.z);

    // Calculate target quaternion
    tempMatrix.current.lookAt(
      new THREE.Vector3(), // Looking from origin for direction
      targetVector,
      upVector
    );
    targetQuaternion.current.setFromRotationMatrix(tempMatrix.current);

    if (prefersReducedMotion) {
      quaternion.current.copy(targetQuaternion.current);
      setIsLooking(true);
      return;
    }

    // Slerp towards target
    const t = 1 - Math.exp(-delta / smoothTime);
    quaternion.current.slerp(targetQuaternion.current, t);

    const angle = quaternion.current.angleTo(targetQuaternion.current);
    setIsLooking(angle < 0.01);
  });

  const apply = useCallback((object: THREE.Object3D) => {
    object.quaternion.copy(quaternion.current);
  }, []);

  return {
    quaternion: quaternion.current,
    apply,
    isLooking,
  };
}

// ============================================================================
// Animation Presets
// ============================================================================

export interface PresetOptions {
  /** Duration of animation in seconds */
  duration?: number;
  /** Intensity multiplier */
  intensity?: number;
  /** Enabled state */
  enabled?: boolean;
}

export interface PresetResult {
  /** Transform to apply */
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  /** Apply to object */
  apply: (object: THREE.Object3D) => void;
  /** Reset animation */
  reset: () => void;
}

export function useAnimationPreset(
  preset: AnimationPreset,
  options: PresetOptions = {}
): PresetResult {
  const { duration = 1, intensity = 1, enabled = true } = options;

  const prefersReducedMotion = usePrefersReducedMotion();
  const position = useRef(new THREE.Vector3());
  const rotation = useRef(new THREE.Euler());
  const scale = useRef(new THREE.Vector3(1, 1, 1));
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!enabled || prefersReducedMotion) {
      position.current.set(0, 0, 0);
      rotation.current.set(0, 0, 0);
      scale.current.set(1, 1, 1);
      return;
    }

    timeRef.current += delta;
    const t = (timeRef.current / duration) % 1;
    const phase = t * Math.PI * 2;

    switch (preset) {
      case 'bounce': {
        const bounceHeight = Math.abs(Math.sin(phase)) * intensity;
        position.current.set(0, bounceHeight, 0);
        break;
      }

      case 'pulse': {
        const pulseScale = 1 + Math.sin(phase) * 0.1 * intensity;
        scale.current.set(pulseScale, pulseScale, pulseScale);
        break;
      }

      case 'spin': {
        rotation.current.set(0, phase * intensity, 0);
        break;
      }

      case 'float': {
        const floatY = Math.sin(phase) * 0.2 * intensity;
        const floatX = Math.sin(phase * 0.5) * 0.1 * intensity;
        position.current.set(floatX, floatY, 0);
        break;
      }

      case 'shake': {
        const shakeX = (Math.random() - 0.5) * 0.1 * intensity;
        const shakeY = (Math.random() - 0.5) * 0.1 * intensity;
        const shakeZ = (Math.random() - 0.5) * 0.1 * intensity;
        position.current.set(shakeX, shakeY, shakeZ);
        break;
      }
    }
  });

  const apply = useCallback((object: THREE.Object3D) => {
    object.position.add(position.current);
    object.rotation.x += rotation.current.x;
    object.rotation.y += rotation.current.y;
    object.rotation.z += rotation.current.z;
    object.scale.multiply(scale.current);
  }, []);

  const reset = useCallback(() => {
    timeRef.current = 0;
    position.current.set(0, 0, 0);
    rotation.current.set(0, 0, 0);
    scale.current.set(1, 1, 1);
  }, []);

  return {
    transform: {
      position: position.current,
      rotation: rotation.current,
      scale: scale.current,
    },
    apply,
    reset,
  };
}

// ============================================================================
// Easing Functions
// ============================================================================

export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  easeOutElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  easeInOutElastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },
  easeInBounce: (t: number) => 1 - easings.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ============================================================================
// Spring Config Presets
// ============================================================================

export const springConfigs = {
  default: springConfig.default,
  gentle: springConfig.gentle,
  wobbly: springConfig.wobbly,
  stiff: springConfig.stiff,
  slow: springConfig.slow,
  molasses: springConfig.molasses,
  snappy: { mass: 1, tension: 400, friction: 30 },
  bouncy: { mass: 1, tension: 180, friction: 12 },
  smooth: { mass: 1, tension: 120, friction: 14 },
};

// ============================================================================
// Exports
// ============================================================================

export {
  usePrefersReducedMotion,
  animated,
};
