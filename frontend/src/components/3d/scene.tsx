/**
 * Scene Component
 *
 * Main 3D scene wrapper with Canvas configuration, controls, and environment.
 *
 * @module components/3d/scene
 */

import * as React from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  FlyControls,
  PointerLockControls,
  Stats,
  Preload,
} from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import type { SceneProps, ControlType } from '@/types/components';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// WebGL Error Boundary
// ============================================================================

interface WebGLErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends React.Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error('WebGL Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ============================================================================
// Loading Indicator
// ============================================================================

function LoadingIndicator() {
  const progress = useThreeStore((state) => state.loadingProgress);
  const asset = useThreeStore((state) => state.loadingAsset);

  if (progress === 0 || progress >= 100) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
      <div className="text-center space-y-4">
        <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading{asset ? `: ${asset}` : '...'}
        </p>
        <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

// ============================================================================
// Dynamic Lighting Component
// ============================================================================

interface DynamicLightingProps {
  shadows: boolean;
}

function DynamicLighting({ shadows }: DynamicLightingProps) {
  // Get lighting values from store or use defaults
  const ambientIntensity = useThreeStore((state) => (state as any).ambientIntensity ?? 0.5);
  const directionalIntensity = useThreeStore((state) => (state as any).directionalIntensity ?? 1.0);

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={directionalIntensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
      />
    </>
  );
}

// ============================================================================
// Performance Monitor
// ============================================================================

function PerformanceMonitor() {
  const updateMetrics = useThreeStore((state) => state.updatePerformanceMetrics);
  const { gl } = useThree();

  useFrame(() => {
    const info = gl.info;
    updateMetrics(
      60, // Would need actual FPS calculation
      info.render.calls,
      info.render.triangles
    );
  });

  return null;
}

// ============================================================================
// Controls Component
// ============================================================================

interface ControlsWrapperProps {
  type: ControlType;
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

function ControlsWrapper({
  type = 'orbit',
  enableDamping = true,
  dampingFactor = 0.05,
  enableZoom = true,
  enablePan = true,
  enableRotate = true,
  minDistance = 1,
  maxDistance = 100,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  autoRotate = false,
  autoRotateSpeed = 2,
}: ControlsWrapperProps) {
  switch (type) {
    case 'fly':
      return (
        <FlyControls
          movementSpeed={10}
          rollSpeed={0.5}
          dragToLook
        />
      );
    case 'pointer-lock':
      return (
        <PointerLockControls />
      );
    case 'orbit':
    default:
      return (
        <OrbitControls
          enableDamping={enableDamping}
          dampingFactor={dampingFactor}
          enableZoom={enableZoom}
          enablePan={enablePan}
          enableRotate={enableRotate}
          minDistance={minDistance}
          maxDistance={maxDistance}
          minPolarAngle={minPolarAngle}
          maxPolarAngle={maxPolarAngle}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      );
  }
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

function KeyboardNavigation() {
  const setCameraPosition = useThreeStore((state) => state.setCameraPosition);
  const resetCamera = useThreeStore((state) => state.resetCamera);
  const { camera } = useThree();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const speed = 0.5;
      const rotationSpeed = 0.05;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
          camera.position.z -= speed;
          break;
        case 'ArrowDown':
        case 's':
          camera.position.z += speed;
          break;
        case 'ArrowLeft':
        case 'a':
          camera.position.x -= speed;
          break;
        case 'ArrowRight':
        case 'd':
          camera.position.x += speed;
          break;
        case '+':
        case '=':
          camera.position.y += speed;
          break;
        case '-':
          camera.position.y -= speed;
          break;
        case ' ':
          resetCamera();
          break;
      }

      setCameraPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, setCameraPosition, resetCamera]);

  return null;
}

// ============================================================================
// Default Fallback
// ============================================================================

function DefaultFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg border-2 border-dashed">
      <div className="text-center space-y-2 p-8">
        <p className="text-lg font-medium text-muted-foreground">
          WebGL Not Available
        </p>
        <p className="text-sm text-muted-foreground">
          Your browser or device does not support WebGL rendering.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Scene Component
// ============================================================================

export function Scene({
  camera = {},
  controls = 'orbit',
  showStats = false,
  background = '#1a1a2e',
  environment,
  shadows = true,
  pixelRatio,
  children,
  onReady,
  fallback = <DefaultFallback />,
  className,
  'data-testid': testId,
}: SceneProps) {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneConfig = useThreeStore((state) => state.sceneConfig);

  // Check WebGL availability
  const [webGLAvailable, setWebGLAvailable] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
      }
    } catch {
      setWebGLAvailable(false);
    }
  }, []);

  // Camera defaults
  const cameraConfig = {
    type: camera.type ?? 'perspective',
    position: camera.position ?? [0, 5, 10],
    fov: camera.fov ?? 50,
    near: camera.near ?? 0.1,
    far: camera.far ?? 1000,
  };

  // Handle ready callback
  useEffect(() => {
    if (isReady && onReady) {
      onReady();
    }
  }, [isReady, onReady]);

  if (!webGLAvailable) {
    return fallback;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className ?? ''}`}
      data-testid={testId}
    >
      <WebGLErrorBoundary fallback={fallback}>
        <Canvas
          camera={{
            position: cameraConfig.position as [number, number, number],
            fov: cameraConfig.fov,
            near: cameraConfig.near,
            far: cameraConfig.far,
          }}
          shadows={shadows && sceneConfig.shadows}
          dpr={pixelRatio ?? Math.min(2, window.devicePixelRatio)}
          gl={{
            antialias: sceneConfig.antialias,
            alpha: true,
            powerPreference: 'high-performance',
            outputColorSpace: SRGBColorSpace,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          onCreated={() => setIsReady(true)}
        >
          <Suspense fallback={null}>
            {/* Lighting - controlled via context */}
            <DynamicLighting shadows={shadows} />

            {/* Environment */}
            {environment && sceneConfig.environment && (
              <Environment preset={environment} background={background === 'environment'} />
            )}

            {/* Background color */}
            {background !== 'environment' && (
              <color attach="background" args={[background]} />
            )}

            {/* Controls */}
            <ControlsWrapper type={controls} />

            {/* Keyboard navigation for accessibility */}
            <KeyboardNavigation />

            {/* Performance monitoring */}
            <PerformanceMonitor />

            {/* User content */}
            {children}

            {/* Preload assets */}
            <Preload all />
          </Suspense>

          {/* Stats (dev only) */}
          {showStats && process.env.NODE_ENV === 'development' && <Stats />}
        </Canvas>
      </WebGLErrorBoundary>

      <LoadingIndicator />
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { ControlsWrapper, WebGLErrorBoundary, LoadingIndicator };
