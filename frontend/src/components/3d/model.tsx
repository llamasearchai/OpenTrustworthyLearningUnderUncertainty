/**
 * Model Component
 *
 * Load and display GLTF/GLB 3D models with animation support.
 *
 * @module components/3d/model
 */

import * as React from 'react';
import { Suspense, useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ModelProps } from '@/types/components';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

interface ModelAnimation {
  name: string;
  duration: number;
}

// ============================================================================
// Loading Placeholder
// ============================================================================

function DefaultPlaceholder() {
  return (
    <Html center>
      <div className="flex items-center justify-center p-4 bg-background/80 rounded-lg">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </Html>
  );
}

// ============================================================================
// Model Loader
// ============================================================================

interface ModelLoaderProps extends Omit<ModelProps, 'placeholder'> {
  onLoaded?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function ModelLoader({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  interactive = false,
  onClick,
  onHover,
  animation,
  animationLoop = true,
  animationSpeed = 1,
  onLoaded,
  onHoverChange,
}: ModelLoaderProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Load model
  const { scene, animations } = useGLTF(src);
  const { actions, mixer } = useAnimations(animations, groupRef);

  // Update loading progress
  const setLoadingProgress = useThreeStore((state) => state.setLoadingProgress);
  const clearLoading = useThreeStore((state) => state.clearLoading);

  // Clone the scene to avoid sharing issues
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  // Handle model loaded
  useEffect(() => {
    setLoadingProgress(100);
    clearLoading();
    onLoaded?.();
  }, [scene, setLoadingProgress, clearLoading, onLoaded]);

  // Enable shadows on all meshes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // Handle animation
  useEffect(() => {
    if (!animation || !actions) return;

    const animationName =
      typeof animation === 'number'
        ? Object.keys(actions)[animation]
        : animation;

    if (animationName && actions[animationName]) {
      const action = actions[animationName];
      action.reset().play();
      action.setLoop(animationLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.timeScale = animationSpeed;

      return () => {
        action.stop();
      };
    }
  }, [animation, actions, animationLoop, animationSpeed]);

  // Update animation speed
  useEffect(() => {
    if (mixer) {
      mixer.timeScale = animationSpeed;
    }
  }, [mixer, animationSpeed]);

  // Handle hover state
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    setHovered(true);
    onHover?.(true);
    onHoverChange?.(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    setHovered(false);
    onHover?.(false);
    onHoverChange?.(false);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onClick?.();
  };

  // Hover animation
  useFrame((_, delta) => {
    if (groupRef.current && interactive && hovered) {
      // Subtle hover animation - can be customized
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Calculate scale
  const scaleArray = (typeof scale === 'number' ? [scale, scale, scale] : scale) as [number, number, number];

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scaleArray}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// Model Component
// ============================================================================

export function Model({
  src,
  position,
  rotation,
  scale,
  interactive,
  onClick,
  onHover,
  animation,
  animationLoop,
  animationSpeed,
  placeholder = <DefaultPlaceholder />,
  className,
}: ModelProps) {
  return (
    <Suspense fallback={placeholder}>
      <ModelLoader
        src={src}
        position={position}
        rotation={rotation}
        scale={scale}
        interactive={interactive}
        onClick={onClick}
        onHover={onHover}
        animation={animation}
        animationLoop={animationLoop}
        animationSpeed={animationSpeed}
      />
    </Suspense>
  );
}

// ============================================================================
// useModel Hook
// ============================================================================

export interface UseModelResult {
  scene: THREE.Group;
  animations: ModelAnimation[];
  mixer: THREE.AnimationMixer | null;
  actions: Record<string, THREE.AnimationAction>;
  playAnimation: (name: string) => void;
  stopAnimation: (name?: string) => void;
  setAnimationTime: (time: number) => void;
}

export function useModel(src: string): UseModelResult {
  const { scene, animations } = useGLTF(src);
  const groupRef = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const playAnimation = React.useCallback(
    (name: string) => {
      const action = actions[name];
      if (action) {
        action.reset().play();
      }
    },
    [actions]
  );

  const stopAnimation = React.useCallback(
    (name?: string) => {
      if (name) {
        actions[name]?.stop();
      } else {
        Object.values(actions).forEach((action) => action?.stop());
      }
    },
    [actions]
  );

  const setAnimationTime = React.useCallback(
    (time: number) => {
      if (mixer) {
        mixer.setTime(time);
      }
    },
    [mixer]
  );

  return {
    scene: scene.clone(),
    animations: animations.map((clip) => ({
      name: clip.name,
      duration: clip.duration,
    })),
    mixer,
    actions: actions as Record<string, THREE.AnimationAction>,
    playAnimation,
    stopAnimation,
    setAnimationTime,
  };
}

// ============================================================================
// Preload Helper
// ============================================================================

Model.preload = useGLTF.preload;

// ============================================================================
// Exports
// ============================================================================

export { ModelLoader, DefaultPlaceholder };
