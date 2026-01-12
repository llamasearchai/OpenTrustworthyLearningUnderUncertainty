/**
 * Scene Component Stories
 *
 * Comprehensive Storybook stories for the 3D Scene component demonstrating
 * various configurations, controls, and 3D content.
 *
 * @module components/3d/Scene.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, expect, fn } from '@storybook/test';
import { Scene, ControlsWrapper } from './scene';
import { Model } from './model';
import { Controls } from './controls';
import * as React from 'react';
import * as THREE from 'three';

// ============================================================================
// Simple 3D Content Components
// ============================================================================

/**
 * A simple rotating cube for demonstration
 */
function DemoCube({ color = '#3b82f6' }: { color?: string }) {
  const meshRef = React.useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * A sphere for demonstration
 */
function DemoSphere({ color = '#22c55e', position = [0, 0, 0] as [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * A ground plane
 */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#374151" />
    </mesh>
  );
}

/**
 * A complex scene with multiple objects
 */
function ComplexScene() {
  return (
    <>
      <DemoCube color="#3b82f6" />
      <DemoSphere color="#22c55e" position={[3, 0, 0]} />
      <DemoSphere color="#ef4444" position={[-3, 0, 0]} />
      <DemoSphere color="#f59e0b" position={[0, 0, 3]} />
      <DemoSphere color="#8b5cf6" position={[0, 0, -3]} />
      <GroundPlane />
    </>
  );
}

/**
 * Animated rotating object
 */
function RotatingCube() {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    let animationId: number;

    const animate = () => {
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.01;
        meshRef.current.rotation.y += 0.01;
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.2 : 1}
    >
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={hovered ? '#ef4444' : '#3b82f6'} />
    </mesh>
  );
}

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof Scene> = {
  title: 'Components/3D/Scene',
  component: Scene,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
A comprehensive 3D scene wrapper component using React Three Fiber.
Provides Canvas setup, camera controls, lighting, and environment configuration.

## Features
- Multiple camera types (perspective, orthographic)
- Multiple control types (orbit, fly, pointer-lock)
- Environment presets and custom backgrounds
- Shadow support
- WebGL error handling with fallback
- Loading progress indicator
- Performance monitoring
- Keyboard navigation accessibility

## Usage

\`\`\`tsx
import { Scene } from '@/components/3d/scene';

<Scene
  camera={{ position: [0, 5, 10], fov: 50 }}
  controls="orbit"
  environment="studio"
  shadows
>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial color="blue" />
  </mesh>
</Scene>
\`\`\`

## Keyboard Controls
- **W/Arrow Up**: Move forward
- **S/Arrow Down**: Move backward
- **A/Arrow Left**: Move left
- **D/Arrow Right**: Move right
- **+/-**: Move up/down
- **Space**: Reset camera
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: false }, // 3D content doesn't need this
        ],
      },
    },
  },
  argTypes: {
    camera: {
      description: 'Camera configuration',
      control: false,
      table: {
        type: { summary: '{ type?: CameraType; position?: [x, y, z]; fov?: number; near?: number; far?: number }' },
      },
    },
    controls: {
      description: 'Control type for camera interaction',
      control: 'select',
      options: ['orbit', 'fly', 'pointer-lock'],
      table: {
        type: { summary: 'ControlType' },
        defaultValue: { summary: 'orbit' },
      },
    },
    showStats: {
      description: 'Show performance stats (dev mode only)',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    background: {
      description: 'Background color or "environment"',
      control: 'color',
      table: {
        type: { summary: 'string | "environment"' },
        defaultValue: { summary: '#1a1a2e' },
      },
    },
    environment: {
      description: 'Environment preset for lighting and reflections',
      control: 'select',
      options: ['sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'],
      table: {
        type: { summary: 'EnvironmentPreset' },
      },
    },
    shadows: {
      description: 'Enable shadow rendering',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    pixelRatio: {
      description: 'Device pixel ratio override',
      control: { type: 'number', min: 1, max: 3, step: 0.5 },
      table: {
        type: { summary: 'number' },
      },
    },
    onReady: {
      description: 'Callback when scene is ready',
      action: 'ready',
      table: {
        type: { summary: '() => void' },
      },
    },
    children: {
      description: '3D content to render in the scene',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    fallback: {
      description: 'Fallback content for non-WebGL browsers',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Scene>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * Default 3D scene with a simple cube and orbit controls.
 */
export const Default: Story = {
  args: {
    controls: 'orbit',
    background: '#1a1a2e',
    shadows: true,
  },
  render: (args) => (
    <Scene {...args}>
      <DemoCube />
      <GroundPlane />
    </Scene>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A basic 3D scene with a cube and ground plane. Use mouse to orbit around the scene.',
      },
    },
  },
};

// ============================================================================
// With Model Story
// ============================================================================

/**
 * Scene with a loaded 3D model.
 */
export const WithModel: Story = {
  render: () => (
    <Scene
      controls="orbit"
      environment="studio"
      shadows
      camera={{ position: [0, 2, 5], fov: 50 }}
    >
      <Model
        src="/models/robot.glb"
        position={[0, -1, 0]}
        scale={1}
        interactive
        onClick={() => alert('Model clicked!')}
      />
      <GroundPlane />
    </Scene>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loads a 3D model from a GLTF/GLB file with interactive hover and click handling.',
      },
    },
  },
};

// ============================================================================
// With Controls Story
// ============================================================================

/**
 * Different control types comparison.
 */
export const WithControls: Story = {
  render: function ControlsRender() {
    const [controlType, setControlType] = React.useState<'orbit' | 'fly' | 'pointer-lock'>('orbit');

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-background border-b flex gap-2">
          <button
            onClick={() => setControlType('orbit')}
            className={`px-3 py-1 rounded text-sm ${controlType === 'orbit' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Orbit
          </button>
          <button
            onClick={() => setControlType('fly')}
            className={`px-3 py-1 rounded text-sm ${controlType === 'fly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Fly
          </button>
          <button
            onClick={() => setControlType('pointer-lock')}
            className={`px-3 py-1 rounded text-sm ${controlType === 'pointer-lock' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Pointer Lock
          </button>
        </div>
        <div className="flex-1">
          <Scene
            key={controlType}
            controls={controlType}
            background="#1a1a2e"
            shadows
          >
            <ComplexScene />
          </Scene>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates different control types: Orbit (drag to rotate), Fly (WASD to move), and Pointer Lock (click to enter, ESC to exit).',
      },
    },
  },
};

// ============================================================================
// Environment Presets Story
// ============================================================================

/**
 * Different environment presets.
 */
export const EnvironmentPresets: Story = {
  render: function EnvironmentRender() {
    const [preset, setPreset] = React.useState<string>('studio');
    const presets = ['sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'];

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-background border-b flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1 rounded text-sm capitalize ${preset === p ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <Scene
            key={preset}
            controls="orbit"
            environment={preset as React.ComponentProps<typeof Scene>['environment']}
            background="environment"
            shadows
          >
            <mesh castShadow>
              <sphereGeometry args={[1.5, 64, 64]} />
              <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
            </mesh>
            <GroundPlane />
          </Scene>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates different environment presets for lighting and reflections on a metallic sphere.',
      },
    },
  },
};

// ============================================================================
// Camera Configurations Story
// ============================================================================

/**
 * Different camera configurations.
 */
export const CameraConfigurations: Story = {
  render: function CameraRender() {
    const [config, setConfig] = React.useState({
      position: [0, 5, 10] as [number, number, number],
      fov: 50,
    });

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-background border-b space-y-2">
          <div className="flex gap-4 items-center text-sm">
            <label>FOV: {config.fov}</label>
            <input
              type="range"
              min="30"
              max="120"
              value={config.fov}
              onChange={(e) => setConfig((c) => ({ ...c, fov: parseInt(e.target.value) }))}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig((c) => ({ ...c, position: [0, 5, 10] }))}
              className="px-3 py-1 rounded text-sm bg-muted"
            >
              Front View
            </button>
            <button
              onClick={() => setConfig((c) => ({ ...c, position: [10, 5, 0] }))}
              className="px-3 py-1 rounded text-sm bg-muted"
            >
              Side View
            </button>
            <button
              onClick={() => setConfig((c) => ({ ...c, position: [0, 15, 0] }))}
              className="px-3 py-1 rounded text-sm bg-muted"
            >
              Top View
            </button>
          </div>
        </div>
        <div className="flex-1">
          <Scene
            key={`${config.position.join('-')}-${config.fov}`}
            camera={config}
            controls="orbit"
            background="#1a1a2e"
            shadows
          >
            <ComplexScene />
          </Scene>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates camera configuration with different positions and field of view settings.',
      },
    },
  },
};

// ============================================================================
// Interactive Objects Story
// ============================================================================

/**
 * Scene with interactive 3D objects.
 */
export const InteractiveObjects: Story = {
  render: () => (
    <Scene
      controls="orbit"
      background="#1a1a2e"
      shadows
    >
      <RotatingCube />
      <GroundPlane />
      <pointLight position={[5, 5, 5]} intensity={100} />
    </Scene>
  ),
  parameters: {
    docs: {
      description: {
        story: 'An animated cube that changes color and scale when hovered.',
      },
    },
  },
};

// ============================================================================
// Custom Background Story
// ============================================================================

/**
 * Scene with custom background colors.
 */
export const CustomBackground: Story = {
  render: function BackgroundRender() {
    const [color, setColor] = React.useState('#1a1a2e');
    const colors = ['#1a1a2e', '#1e3a5f', '#2d1b4e', '#1a2e1a', '#3d2b1f', '#ffffff'];

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-background border-b flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded border-2"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#3b82f6' : 'transparent',
              }}
              aria-label={`Set background to ${c}`}
            />
          ))}
        </div>
        <div className="flex-1">
          <Scene
            controls="orbit"
            background={color}
            shadows
          >
            <DemoCube color="#3b82f6" />
            <GroundPlane />
          </Scene>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom background colors for the 3D scene.',
      },
    },
  },
};

// ============================================================================
// Shadows Demo Story
// ============================================================================

/**
 * Scene demonstrating shadow rendering.
 */
export const ShadowsDemo: Story = {
  render: function ShadowRender() {
    const [shadowsEnabled, setShadowsEnabled] = React.useState(true);

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-background border-b flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shadowsEnabled}
              onChange={(e) => setShadowsEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            Enable Shadows
          </label>
        </div>
        <div className="flex-1">
          <Scene
            key={`shadows-${shadowsEnabled}`}
            controls="orbit"
            background="#1a1a2e"
            shadows={shadowsEnabled}
          >
            <mesh position={[0, 1, 0]} castShadow>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[2, 0.5, 1]} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#3b82f6" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[15, 15]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
          </Scene>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates shadow rendering with toggle to enable/disable.',
      },
    },
  },
};

// ============================================================================
// WebGL Fallback Story
// ============================================================================

/**
 * Fallback content when WebGL is not available.
 */
export const WebGLFallback: Story = {
  render: () => (
    <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed">
      <div className="text-center space-y-2 p-8">
        <p className="text-lg font-medium text-muted-foreground">
          WebGL Not Available
        </p>
        <p className="text-sm text-muted-foreground">
          Your browser or device does not support WebGL rendering.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          This is what users see when WebGL is unavailable.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows the fallback UI when WebGL is not supported or available.',
      },
    },
  },
};

// ============================================================================
// Performance Stats Story
// ============================================================================

/**
 * Scene with performance stats enabled.
 */
export const WithPerformanceStats: Story = {
  args: {
    controls: 'orbit',
    background: '#1a1a2e',
    shadows: true,
    showStats: true,
  },
  render: (args) => (
    <Scene {...args}>
      <ComplexScene />
    </Scene>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows performance statistics (FPS, render time) in development mode.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Scene with accessibility features demonstrated.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-background border-b text-sm">
        <h3 className="font-medium mb-2">Keyboard Controls:</h3>
        <ul className="space-y-1 text-muted-foreground">
          <li><kbd className="px-1 bg-muted rounded">W</kbd> / <kbd className="px-1 bg-muted rounded">Arrow Up</kbd> - Move forward</li>
          <li><kbd className="px-1 bg-muted rounded">S</kbd> / <kbd className="px-1 bg-muted rounded">Arrow Down</kbd> - Move backward</li>
          <li><kbd className="px-1 bg-muted rounded">A</kbd> / <kbd className="px-1 bg-muted rounded">Arrow Left</kbd> - Move left</li>
          <li><kbd className="px-1 bg-muted rounded">D</kbd> / <kbd className="px-1 bg-muted rounded">Arrow Right</kbd> - Move right</li>
          <li><kbd className="px-1 bg-muted rounded">+</kbd> / <kbd className="px-1 bg-muted rounded">-</kbd> - Move up/down</li>
          <li><kbd className="px-1 bg-muted rounded">Space</kbd> - Reset camera view</li>
        </ul>
      </div>
      <div className="flex-1">
        <Scene
          controls="orbit"
          background="#1a1a2e"
          shadows
          data-testid="accessible-scene"
        >
          <DemoCube />
          <GroundPlane />
        </Scene>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates keyboard navigation accessibility features for users who cannot use a mouse.',
      },
    },
  },
};
