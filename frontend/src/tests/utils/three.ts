/**
 * Three.js Test Utilities
 *
 * Utilities for testing Three.js and React Three Fiber components.
 *
 * @module tests/utils/three
 */

import { vi } from 'vitest';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface MockCanvasOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
}

export interface PointerEvent3DOptions {
  clientX: number;
  clientY: number;
  button?: number;
  pointerType?: 'mouse' | 'touch' | 'pen';
  pointerId?: number;
  pressure?: number;
}

export interface MockRendererOptions {
  width?: number;
  height?: number;
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
}

// ============================================================================
// Create Mock Canvas
// ============================================================================

/**
 * Creates a mock canvas element with WebGL context support.
 * Useful for testing Three.js components that require a canvas.
 */
export function createMockCanvas(options: MockCanvasOptions = {}): HTMLCanvasElement {
  const { width = 800, height = 600, pixelRatio = 1 } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Mock getBoundingClientRect
  canvas.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  }));

  // Mock getContext for 2D (used by some Three.js features)
  const originalGetContext = canvas.getContext.bind(canvas);
  canvas.getContext = vi.fn((contextId: string, options?: unknown) => {
    if (contextId === '2d') {
      return {
        canvas,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        rect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        measureText: vi.fn(() => ({
          width: 0,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: 0,
          fontBoundingBoxAscent: 0,
          fontBoundingBoxDescent: 0,
          actualBoundingBoxAscent: 0,
          actualBoundingBoxDescent: 0,
        })),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createPattern: vi.fn(),
      };
    }
    return originalGetContext(contextId, options);
  }) as typeof canvas.getContext;

  return canvas;
}

// ============================================================================
// Mock WebGL Renderer
// ============================================================================

/**
 * A mock implementation of THREE.WebGLRenderer for testing.
 * Provides all essential methods as no-op functions.
 */
export class MockWebGLRenderer {
  domElement: HTMLCanvasElement;
  shadowMap: { enabled: boolean; type: number };
  outputEncoding: number;
  outputColorSpace: string;
  toneMapping: number;
  toneMappingExposure: number;
  physicallyCorrectLights: boolean;
  info: {
    render: { calls: number; triangles: number; points: number; lines: number };
    memory: { geometries: number; textures: number };
    programs: unknown[];
  };
  capabilities: {
    isWebGL2: boolean;
    precision: string;
    logarithmicDepthBuffer: boolean;
    maxTextures: number;
    maxVertexTextures: number;
    maxTextureSize: number;
    maxCubemapSize: number;
    maxAttributes: number;
    maxVertexUniforms: number;
    maxVaryings: number;
    maxFragmentUniforms: number;
    vertexTextures: boolean;
    floatFragmentTextures: boolean;
    floatVertexTextures: boolean;
  };
  extensions: { get: (name: string) => unknown };
  properties: { get: (object: unknown) => Record<string, unknown> };
  private _width: number;
  private _height: number;
  private _pixelRatio: number;

  constructor(options: MockRendererOptions = {}) {
    const { width = 800, height = 600, antialias = false, alpha = false } = options;

    this.domElement = createMockCanvas({ width, height });
    this._width = width;
    this._height = height;
    this._pixelRatio = 1;

    this.shadowMap = {
      enabled: false,
      type: THREE.PCFShadowMap,
    };

    this.outputEncoding = THREE.sRGBEncoding ?? 3001;
    this.outputColorSpace = 'srgb';
    this.toneMapping = THREE.NoToneMapping;
    this.toneMappingExposure = 1;
    this.physicallyCorrectLights = false;

    this.info = {
      render: { calls: 0, triangles: 0, points: 0, lines: 0 },
      memory: { geometries: 0, textures: 0 },
      programs: [],
    };

    this.capabilities = {
      isWebGL2: true,
      precision: 'highp',
      logarithmicDepthBuffer: false,
      maxTextures: 16,
      maxVertexTextures: 16,
      maxTextureSize: 4096,
      maxCubemapSize: 4096,
      maxAttributes: 16,
      maxVertexUniforms: 4096,
      maxVaryings: 32,
      maxFragmentUniforms: 4096,
      vertexTextures: true,
      floatFragmentTextures: true,
      floatVertexTextures: true,
    };

    this.extensions = {
      get: vi.fn(() => null),
    };

    this.properties = {
      get: vi.fn(() => ({})),
    };
  }

  getContext(): WebGLRenderingContext | null {
    return this.domElement.getContext('webgl');
  }

  getContextAttributes(): WebGLContextAttributes | null {
    return {};
  }

  forceContextLoss(): void {}
  forceContextRestore(): void {}

  getPixelRatio(): number {
    return this._pixelRatio;
  }

  setPixelRatio(value: number): void {
    this._pixelRatio = value;
  }

  getSize(target: THREE.Vector2): THREE.Vector2 {
    return target.set(this._width, this._height);
  }

  setSize(width: number, height: number, updateStyle?: boolean): void {
    this._width = width;
    this._height = height;
    if (updateStyle !== false) {
      this.domElement.style.width = `${width}px`;
      this.domElement.style.height = `${height}px`;
    }
    this.domElement.width = width * this._pixelRatio;
    this.domElement.height = height * this._pixelRatio;
  }

  getDrawingBufferSize(target: THREE.Vector2): THREE.Vector2 {
    return target.set(this._width * this._pixelRatio, this._height * this._pixelRatio);
  }

  setDrawingBufferSize(width: number, height: number, pixelRatio: number): void {
    this._width = width;
    this._height = height;
    this._pixelRatio = pixelRatio;
  }

  getCurrentViewport(target: THREE.Vector4): THREE.Vector4 {
    return target.set(0, 0, this._width, this._height);
  }

  getViewport(target: THREE.Vector4): THREE.Vector4 {
    return target.set(0, 0, this._width, this._height);
  }

  setViewport(x: number | THREE.Vector4, y?: number, width?: number, height?: number): void {}

  getScissor(target: THREE.Vector4): THREE.Vector4 {
    return target.set(0, 0, this._width, this._height);
  }

  setScissor(x: number | THREE.Vector4, y?: number, width?: number, height?: number): void {}

  getScissorTest(): boolean {
    return false;
  }

  setScissorTest(boolean: boolean): void {}

  setOpaqueSort(method: (a: unknown, b: unknown) => number): void {}
  setTransparentSort(method: (a: unknown, b: unknown) => number): void {}

  getClearColor(target: THREE.Color): THREE.Color {
    return target.set(0x000000);
  }

  setClearColor(color: THREE.ColorRepresentation, alpha?: number): void {}

  getClearAlpha(): number {
    return 1;
  }

  setClearAlpha(alpha: number): void {}

  clear(color?: boolean, depth?: boolean, stencil?: boolean): void {}
  clearColor(): void {}
  clearDepth(): void {}
  clearStencil(): void {}

  dispose(): void {}

  renderBufferDirect(
    camera: THREE.Camera,
    scene: THREE.Scene,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    object: THREE.Object3D,
    group: unknown
  ): void {}

  renderBufferImmediate(object: THREE.Object3D, program: unknown): void {}

  render(scene: THREE.Object3D, camera: THREE.Camera): void {}

  getActiveCubeFace(): number {
    return 0;
  }

  getActiveMipmapLevel(): number {
    return 0;
  }

  getRenderTarget(): THREE.RenderTarget | null {
    return null;
  }

  setRenderTarget(
    renderTarget: THREE.RenderTarget | null,
    activeCubeFace?: number,
    activeMipmapLevel?: number
  ): void {}

  readRenderTargetPixels(
    renderTarget: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number,
    buffer: ArrayBufferView,
    activeCubeFaceIndex?: number
  ): void {}

  copyFramebufferToTexture(position: THREE.Vector2, texture: THREE.Texture, level?: number): void {}

  copyTextureToTexture(
    position: THREE.Vector2,
    srcTexture: THREE.Texture,
    dstTexture: THREE.Texture,
    level?: number
  ): void {}

  copyTextureToTexture3D(
    sourceBox: THREE.Box3,
    position: THREE.Vector3,
    srcTexture: THREE.Texture,
    dstTexture: THREE.Data3DTexture,
    level?: number
  ): void {}

  initTexture(texture: THREE.Texture): void {}

  resetState(): void {}

  compile(scene: THREE.Object3D, camera: THREE.Camera): void {}

  setAnimationLoop(callback: ((time: number) => void) | null): void {}
}

// ============================================================================
// Simulate Pointer Events
// ============================================================================

/**
 * Simulates a 3D pointer event on a canvas element.
 * Useful for testing Three.js interactions like clicking on objects.
 */
export function simulatePointerEvent3D(
  canvas: HTMLCanvasElement,
  eventType: 'pointerdown' | 'pointermove' | 'pointerup' | 'click',
  options: PointerEvent3DOptions
): void {
  const {
    clientX,
    clientY,
    button = 0,
    pointerType = 'mouse',
    pointerId = 1,
    pressure = 0.5,
  } = options;

  const rect = canvas.getBoundingClientRect();

  const event = new PointerEvent(eventType, {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + clientX,
    clientY: rect.top + clientY,
    button,
    buttons: button === 0 ? 1 : button,
    pointerType,
    pointerId,
    pressure,
    isPrimary: true,
    view: window,
  });

  canvas.dispatchEvent(event);
}

/**
 * Simulates a click at a specific 3D position.
 * Converts 3D world coordinates to 2D screen coordinates.
 */
export function simulateClick3D(
  canvas: HTMLCanvasElement,
  position3D: THREE.Vector3,
  camera: THREE.Camera
): void {
  const pos = position3D.clone().project(camera);
  const rect = canvas.getBoundingClientRect();

  const clientX = ((pos.x + 1) / 2) * rect.width;
  const clientY = ((-pos.y + 1) / 2) * rect.height;

  simulatePointerEvent3D(canvas, 'pointerdown', { clientX, clientY });
  simulatePointerEvent3D(canvas, 'pointerup', { clientX, clientY });
  simulatePointerEvent3D(canvas, 'click', { clientX, clientY });
}

/**
 * Simulates a drag operation in 3D space.
 */
export function simulateDrag3D(
  canvas: HTMLCanvasElement,
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps: number = 10
): void {
  simulatePointerEvent3D(canvas, 'pointerdown', { clientX: start.x, clientY: start.y });

  const dx = (end.x - start.x) / steps;
  const dy = (end.y - start.y) / steps;

  for (let i = 1; i <= steps; i++) {
    simulatePointerEvent3D(canvas, 'pointermove', {
      clientX: start.x + dx * i,
      clientY: start.y + dy * i,
    });
  }

  simulatePointerEvent3D(canvas, 'pointerup', { clientX: end.x, clientY: end.y });
}

// ============================================================================
// Create Mock Scene
// ============================================================================

/**
 * Creates a mock Three.js scene with common elements for testing.
 */
export function createMockScene(options?: {
  withCamera?: boolean;
  withLight?: boolean;
  withMesh?: boolean;
}): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  if (options?.withCamera) {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 0, 5);
    scene.add(camera);
  }

  if (options?.withLight) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
  }

  if (options?.withMesh) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'testMesh';
    scene.add(mesh);
  }

  return scene;
}

// ============================================================================
// Mock Objects
// ============================================================================

/**
 * Creates a mock Three.js mesh for testing.
 */
export function createMockMesh(name: string = 'mockMesh'): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

/**
 * Creates a mock Three.js group for testing.
 */
export function createMockGroup(name: string = 'mockGroup'): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

/**
 * Creates a mock Three.js camera for testing.
 */
export function createMockCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  return camera;
}

// ============================================================================
// Raycaster Helpers
// ============================================================================

/**
 * Performs a raycast from screen coordinates.
 */
export function raycastFromScreen(
  x: number,
  y: number,
  width: number,
  height: number,
  camera: THREE.Camera,
  objects: THREE.Object3D[]
): THREE.Intersection[] {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  pointer.x = (x / width) * 2 - 1;
  pointer.y = -(y / height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, true);
}

// ============================================================================
// Animation Helpers
// ============================================================================

/**
 * Advances the animation loop by a specified number of frames.
 */
export async function advanceFrames(frameCount: number): Promise<void> {
  for (let i = 0; i < frameCount; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/**
 * Waits for the next animation frame.
 */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

// ============================================================================
// Geometry Helpers
// ============================================================================

/**
 * Creates test geometry data.
 */
export function createTestGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return geometry;
}

// ============================================================================
// Exports
// ============================================================================

export {
  THREE,
};
