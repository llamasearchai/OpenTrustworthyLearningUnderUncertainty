/**
 * Controls Component
 *
 * Comprehensive 3D camera controls with support for multiple control types,
 * keyboard navigation, and accessibility features.
 *
 * @module components/3d/controls
 */

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls as DreiOrbitControls,
  FlyControls as DreiFlyControls,
  PointerLockControls as DreiPointerLockControls,
} from '@react-three/drei';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ControlType } from '@/types/components';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

export type ControlsType = 'orbit' | 'fly' | 'pointer-lock';

export interface OrbitControlsConfig {
  /** Enable smooth damping */
  enableDamping?: boolean;
  /** Damping factor (0-1) */
  dampingFactor?: number;
  /** Enable zoom with mouse wheel */
  enableZoom?: boolean;
  /** Enable panning with right mouse button */
  enablePan?: boolean;
  /** Enable rotation with left mouse button */
  enableRotate?: boolean;
  /** Minimum zoom distance */
  minDistance?: number;
  /** Maximum zoom distance */
  maxDistance?: number;
  /** Minimum polar angle (vertical rotation limit in radians) */
  minPolarAngle?: number;
  /** Maximum polar angle (vertical rotation limit in radians) */
  maxPolarAngle?: number;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed (revolutions per second) */
  autoRotateSpeed?: number;
  /** Target point to orbit around */
  target?: [number, number, number];
}

export interface FlyControlsConfig {
  /** Movement speed */
  movementSpeed?: number;
  /** Roll speed (rotation speed) */
  rollSpeed?: number;
  /** Enable drag-to-look instead of auto-look */
  dragToLook?: boolean;
  /** Auto forward movement */
  autoForward?: boolean;
}

export interface PointerLockControlsConfig {
  /** Instructions text for pointer lock overlay */
  instructions?: string;
  /** Custom instructions component */
  instructionsComponent?: React.ReactNode;
}

export interface ControlsProps {
  /** Control type */
  type?: ControlsType;
  /** Whether controls are enabled */
  enabled?: boolean;
  /** Callback when controls change (camera moves) */
  onChange?: (event: { type: 'change'; target: any }) => void;
  /** Callback when controls start being used */
  onStart?: () => void;
  /** Callback when controls stop being used */
  onEnd?: () => void;
  /** Enable keyboard navigation */
  enableKeyboard?: boolean;
  /** Orbit controls configuration */
  orbit?: OrbitControlsConfig;
  /** Fly controls configuration */
  fly?: FlyControlsConfig;
  /** Pointer lock controls configuration */
  pointerLock?: PointerLockControlsConfig;
  /** CSS class name for overlays */
  className?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_ORBIT_CONFIG: OrbitControlsConfig = {
  enableDamping: true,
  dampingFactor: 0.05,
  enableZoom: true,
  enablePan: true,
  enableRotate: true,
  minDistance: 1,
  maxDistance: 100,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  autoRotate: false,
  autoRotateSpeed: 2,
};

const DEFAULT_FLY_CONFIG: FlyControlsConfig = {
  movementSpeed: 10,
  rollSpeed: 0.5,
  dragToLook: true,
  autoForward: false,
};

const DEFAULT_POINTER_LOCK_CONFIG: PointerLockControlsConfig = {
  instructions: 'Click to enter navigation mode. Press ESC to exit.',
};

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================

export interface KeyboardNavigationOptions {
  /** Movement speed for WASD keys */
  movementSpeed?: number;
  /** Rotation speed for arrow keys */
  rotationSpeed?: number;
  /** Zoom speed for +/- keys */
  zoomSpeed?: number;
  /** Enable keyboard navigation */
  enabled?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    movementSpeed = 0.5,
    rotationSpeed = 0.05,
    zoomSpeed = 0.5,
    enabled = true,
  } = options;

  const { camera, gl } = useThree();
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);
  const resetCamera = useThreeStore((state) => state.resetCamera);

  const keysPressed = useRef<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      keysPressed.current.add(event.key.toLowerCase());

      // Handle space for reset view
      if (event.key === ' ') {
        event.preventDefault();
        resetCamera();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, resetCamera]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const keys = keysPressed.current;
    const moveForward = keys.has('w') || keys.has('arrowup');
    const moveBackward = keys.has('s') || keys.has('arrowdown');
    const moveLeft = keys.has('a') || keys.has('arrowleft');
    const moveRight = keys.has('d') || keys.has('arrowright');
    const moveUp = keys.has('q') || keys.has('+') || keys.has('=');
    const moveDown = keys.has('e') || keys.has('-');
    const rotateLeft = keys.has('arrowleft') && keys.has('shift');
    const rotateRight = keys.has('arrowright') && keys.has('shift');

    // Apply rotation
    if (rotateLeft) {
      camera.rotation.y += rotationSpeed;
    }
    if (rotateRight) {
      camera.rotation.y -= rotationSpeed;
    }

    // Calculate movement direction
    direction.current.set(0, 0, 0);

    if (moveForward && !keys.has('shift')) {
      direction.current.z -= 1;
    }
    if (moveBackward && !keys.has('shift')) {
      direction.current.z += 1;
    }
    if (moveLeft && !keys.has('shift')) {
      direction.current.x -= 1;
    }
    if (moveRight && !keys.has('shift')) {
      direction.current.x += 1;
    }
    if (moveUp) {
      direction.current.y += 1;
    }
    if (moveDown) {
      direction.current.y -= 1;
    }

    // Normalize and apply movement
    if (direction.current.length() > 0) {
      direction.current.normalize();
      direction.current.applyQuaternion(camera.quaternion);

      velocity.current.copy(direction.current).multiplyScalar(movementSpeed * delta * 60);
      camera.position.add(velocity.current);

      // Update store
      setCameraPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });
    }
  });

  return keysPressed.current;
}

// ============================================================================
// Orbit Controls Component
// ============================================================================

interface OrbitControlsComponentProps extends OrbitControlsConfig {
  enabled?: boolean;
  onChange?: (event: any) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

function OrbitControlsComponent({
  enabled = true,
  onChange,
  onStart,
  onEnd,
  ...config
}: OrbitControlsComponentProps) {
  const mergedConfig = { ...DEFAULT_ORBIT_CONFIG, ...config };
  const controlsRef = useRef<any>(null);
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);
  const setCameraTarget = useThreeStore((state) => state.setCameraTarget);

  const handleChange = useCallback(
    (event: any) => {
      if (controlsRef.current) {
        const { object, target } = controlsRef.current;
        setCameraPosition({
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        });
        setCameraTarget({
          x: target.x,
          y: target.y,
          z: target.z,
        });
      }
      onChange?.(event);
    },
    [onChange, setCameraPosition, setCameraTarget]
  );

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enabled={enabled}
      enableDamping={mergedConfig.enableDamping}
      dampingFactor={mergedConfig.dampingFactor}
      enableZoom={mergedConfig.enableZoom}
      enablePan={mergedConfig.enablePan}
      enableRotate={mergedConfig.enableRotate}
      minDistance={mergedConfig.minDistance}
      maxDistance={mergedConfig.maxDistance}
      minPolarAngle={mergedConfig.minPolarAngle}
      maxPolarAngle={mergedConfig.maxPolarAngle}
      autoRotate={mergedConfig.autoRotate}
      autoRotateSpeed={mergedConfig.autoRotateSpeed}
      target={mergedConfig.target}
      onChange={handleChange}
      onStart={onStart}
      onEnd={onEnd}
    />
  );
}

// ============================================================================
// Fly Controls Component
// ============================================================================

interface FlyControlsComponentProps extends FlyControlsConfig {
  enabled?: boolean;
  onChange?: (event: any) => void;
}

function FlyControlsComponent({
  enabled = true,
  onChange,
  ...config
}: FlyControlsComponentProps) {
  const mergedConfig = { ...DEFAULT_FLY_CONFIG, ...config };
  const controlsRef = useRef<any>(null);
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);

  useFrame(() => {
    if (controlsRef.current && enabled) {
      controlsRef.current.update(1);
    }
  });

  const handleChange = useCallback(
    (event: any) => {
      if (controlsRef.current) {
        const { object } = controlsRef.current;
        setCameraPosition({
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        });
      }
      onChange?.(event);
    },
    [onChange, setCameraPosition]
  );

  return (
    <DreiFlyControls
      {...({
        ref: controlsRef,
        enabled,
        movementSpeed: mergedConfig.movementSpeed,
        rollSpeed: mergedConfig.rollSpeed,
        dragToLook: mergedConfig.dragToLook,
        autoForward: mergedConfig.autoForward,
        onChange: handleChange,
      } as any)}
    />
  );
}

// ============================================================================
// Pointer Lock Controls Component
// ============================================================================

interface PointerLockControlsComponentProps extends PointerLockControlsConfig {
  enabled?: boolean;
  onChange?: (event: any) => void;
  className?: string;
}

function PointerLockControlsComponent({
  enabled = true,
  onChange,
  instructions,
  instructionsComponent,
  className,
}: PointerLockControlsComponentProps) {
  const mergedConfig = { ...DEFAULT_POINTER_LOCK_CONFIG, instructions };
  const controlsRef = useRef<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);

  const handleLock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const handleChange = useCallback(
    (event: any) => {
      if (controlsRef.current) {
        const camera = controlsRef.current.getObject();
        setCameraPosition({
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        });
      }
      onChange?.(event);
    },
    [onChange, setCameraPosition]
  );

  const handleClick = useCallback(() => {
    if (controlsRef.current && enabled) {
      controlsRef.current.lock();
    }
  }, [enabled]);

  return (
    <>
      <DreiPointerLockControls
        ref={controlsRef}
        enabled={enabled}
        onChange={handleChange}
        onLock={handleLock}
        onUnlock={handleUnlock}
      />
      {!isLocked && enabled && (
        <Html fullscreen>
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer ${className ?? ''}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            aria-label="Click to enter pointer lock navigation mode"
          >
            {instructionsComponent ?? (
              <div className="text-center text-white p-8 rounded-lg bg-black/50">
                <p className="text-lg font-medium mb-2">Navigation Mode</p>
                <p className="text-sm text-white/80">
                  {mergedConfig.instructions}
                </p>
                <p className="text-xs text-white/60 mt-4">
                  Use WASD to move, mouse to look around
                </p>
              </div>
            )}
          </div>
        </Html>
      )}
    </>
  );
}

// ============================================================================
// Main Controls Component
// ============================================================================

export function Controls({
  type = 'orbit',
  enabled = true,
  onChange,
  onStart,
  onEnd,
  enableKeyboard = true,
  orbit,
  fly,
  pointerLock,
  className,
}: ControlsProps) {
  // Keyboard navigation
  useKeyboardNavigation({ enabled: enableKeyboard && enabled });

  switch (type) {
    case 'fly':
      return (
        <FlyControlsComponent
          enabled={enabled}
          onChange={onChange}
          {...fly}
        />
      );
    case 'pointer-lock':
      return (
        <PointerLockControlsComponent
          enabled={enabled}
          onChange={onChange}
          className={className}
          {...pointerLock}
        />
      );
    case 'orbit':
    default:
      return (
        <OrbitControlsComponent
          enabled={enabled}
          onChange={onChange}
          onStart={onStart}
          onEnd={onEnd}
          {...orbit}
        />
      );
  }
}

// ============================================================================
// Camera Reset Hook
// ============================================================================

export interface CameraResetOptions {
  /** Default camera position */
  defaultPosition?: [number, number, number];
  /** Default camera target */
  defaultTarget?: [number, number, number];
  /** Animation duration in seconds */
  duration?: number;
}

export function useCameraReset(options: CameraResetOptions = {}) {
  const {
    defaultPosition = [0, 5, 10],
    defaultTarget = [0, 0, 0],
    duration = 1,
  } = options;

  const { camera } = useThree();
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);
  const setCameraTarget = useThreeStore((state) => state.setCameraTarget);

  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3(...defaultPosition));

  const reset = useCallback(() => {
    startPosition.current.copy(camera.position);
    endPosition.current.set(...defaultPosition);
    animationProgress.current = 0;
    isAnimating.current = true;
  }, [camera, defaultPosition]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    animationProgress.current += delta / duration;

    if (animationProgress.current >= 1) {
      animationProgress.current = 1;
      isAnimating.current = false;
    }

    // Smooth easing
    const t = 1 - Math.pow(1 - animationProgress.current, 3);

    camera.position.lerpVectors(
      startPosition.current,
      endPosition.current,
      t
    );

    setCameraPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    });

    if (!isAnimating.current) {
      setCameraTarget({
        x: defaultTarget[0],
        y: defaultTarget[1],
        z: defaultTarget[2],
      });
    }
  });

  return { reset, isAnimating: isAnimating.current };
}

// ============================================================================
// Camera State Hook
// ============================================================================

export function useCameraState() {
  const { camera } = useThree();
  const cameraPosition = useThreeStore((state) => state.cameraPosition);
  const cameraTarget = useThreeStore((state) => state.cameraTarget);
  const cameraFov = useThreeStore((state) => state.cameraFov);
  const cameraZoom = useThreeStore((state) => state.cameraZoom);

  return {
    position: cameraPosition,
    target: cameraTarget,
    fov: cameraFov,
    zoom: cameraZoom,
    camera,
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  OrbitControlsComponent,
  FlyControlsComponent,
  PointerLockControlsComponent,
};
