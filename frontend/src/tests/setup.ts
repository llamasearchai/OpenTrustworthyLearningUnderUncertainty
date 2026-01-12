/**
 * Vitest Test Setup
 *
 * Global test configuration with mocks for browser APIs.
 *
 * @module tests/setup
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { enableMapSet } from 'immer';
import { server } from './mocks/server';

// Enable Immer MapSet plugin for Set/Map support in stores
enableMapSet();

// ============================================================================
// MSW Server Lifecycle
// ============================================================================

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// ============================================================================
// Cleanup
// ============================================================================

afterEach(() => {
  cleanup();
});

// ============================================================================
// ResizeObserver Mock
// ============================================================================

class ResizeObserverMock {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock;

// ============================================================================
// IntersectionObserver Mock
// ============================================================================

class IntersectionObserverMock {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  get root(): Element | null {
    return null;
  }

  get rootMargin(): string {
    return '';
  }

  get thresholds(): ReadonlyArray<number> {
    return [];
  }
}

global.IntersectionObserver = IntersectionObserverMock;

// ============================================================================
// matchMedia Mock
// ============================================================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// scrollTo Mock
// ============================================================================

window.scrollTo = vi.fn().mockImplementation((x: number | ScrollToOptions, y?: number) => {});



// ============================================================================
// WebGL Context Mock
// ============================================================================

const mockWebGLContext = {
  attachShader: vi.fn(),
  bindBuffer: vi.fn(),
  bindFramebuffer: vi.fn(),
  bindRenderbuffer: vi.fn(),
  bindTexture: vi.fn(),
  blendFunc: vi.fn(),
  bufferData: vi.fn(),
  checkFramebufferStatus: vi.fn(() => 36053),
  clear: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  clearStencil: vi.fn(),
  compileShader: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  createFramebuffer: vi.fn(() => ({})),
  createProgram: vi.fn(() => ({})),
  createRenderbuffer: vi.fn(() => ({})),
  createShader: vi.fn(() => ({})),
  createTexture: vi.fn(() => ({})),
  cullFace: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteFramebuffer: vi.fn(),
  deleteProgram: vi.fn(),
  deleteRenderbuffer: vi.fn(),
  deleteShader: vi.fn(),
  deleteTexture: vi.fn(),
  depthFunc: vi.fn(),
  depthMask: vi.fn(),
  disable: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  enable: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  framebufferRenderbuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  frontFace: vi.fn(),
  generateMipmap: vi.fn(),
  getAttribLocation: vi.fn(() => 0),
  getContextAttributes: vi.fn(() => ({})),
  getError: vi.fn(() => 0),
  getExtension: vi.fn(() => null),
  getParameter: vi.fn(() => null),
  getProgramInfoLog: vi.fn(() => ''),
  getProgramParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  getShaderParameter: vi.fn(() => true),
  getShaderPrecisionFormat: vi.fn(() => ({ precision: 23, rangeMin: 127, rangeMax: 127 })),
  getSupportedExtensions: vi.fn(() => []),
  getUniformLocation: vi.fn(() => ({})),
  linkProgram: vi.fn(),
  pixelStorei: vi.fn(),
  renderbufferStorage: vi.fn(),
  scissor: vi.fn(),
  shaderSource: vi.fn(),
  stencilFunc: vi.fn(),
  stencilMask: vi.fn(),
  stencilOp: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3f: vi.fn(),
  uniform3fv: vi.fn(),
  uniform4f: vi.fn(),
  uniform4fv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  useProgram: vi.fn(),
  validateProgram: vi.fn(),
  vertexAttribPointer: vi.fn(),
  viewport: vi.fn(),
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  // WebGL2 additional methods
  bindVertexArray: vi.fn(),
  createVertexArray: vi.fn(() => ({})),
  deleteVertexArray: vi.fn(),
  vertexAttribDivisor: vi.fn(),
  drawArraysInstanced: vi.fn(),
  drawElementsInstanced: vi.fn(),
  createQuery: vi.fn(() => ({})),
  deleteQuery: vi.fn(),
  beginQuery: vi.fn(),
  endQuery: vi.fn(),
  getQueryParameter: vi.fn(() => null),
  createSampler: vi.fn(() => ({})),
  deleteSampler: vi.fn(),
  bindSampler: vi.fn(),
  samplerParameteri: vi.fn(),
  samplerParameterf: vi.fn(),
  fenceSync: vi.fn(() => ({})),
  deleteSync: vi.fn(),
  clientWaitSync: vi.fn(() => 0),
  waitSync: vi.fn(),
  createTransformFeedback: vi.fn(() => ({})),
  deleteTransformFeedback: vi.fn(),
  bindTransformFeedback: vi.fn(),
  beginTransformFeedback: vi.fn(),
  endTransformFeedback: vi.fn(),
  transformFeedbackVaryings: vi.fn(),
  getTransformFeedbackVarying: vi.fn(() => null),
  uniform1ui: vi.fn(),
  uniform2ui: vi.fn(),
  uniform3ui: vi.fn(),
  uniform4ui: vi.fn(),
  uniformBlockBinding: vi.fn(),
  getUniformBlockIndex: vi.fn(() => 0),
  getActiveUniformBlockParameter: vi.fn(() => null),
  bindBufferBase: vi.fn(),
  bindBufferRange: vi.fn(),
  getIndexedParameter: vi.fn(() => null),
  getUniformIndices: vi.fn(() => []),
  getActiveUniforms: vi.fn(() => []),
  copyBufferSubData: vi.fn(),
  getBufferSubData: vi.fn(),
  blitFramebuffer: vi.fn(),
  readBuffer: vi.fn(),
  invalidateFramebuffer: vi.fn(),
  invalidateSubFramebuffer: vi.fn(),
  renderbufferStorageMultisample: vi.fn(),
  texStorage2D: vi.fn(),
  texStorage3D: vi.fn(),
  texImage3D: vi.fn(),
  texSubImage3D: vi.fn(),
  copyTexSubImage3D: vi.fn(),
  compressedTexImage3D: vi.fn(),
  compressedTexSubImage3D: vi.fn(),
  getFragDataLocation: vi.fn(() => -1),
  uniform1uiv: vi.fn(),
  uniform2uiv: vi.fn(),
  uniform3uiv: vi.fn(),
  uniform4uiv: vi.fn(),
  uniformMatrix2x3fv: vi.fn(),
  uniformMatrix3x2fv: vi.fn(),
  uniformMatrix2x4fv: vi.fn(),
  uniformMatrix4x2fv: vi.fn(),
  uniformMatrix3x4fv: vi.fn(),
  uniformMatrix4x3fv: vi.fn(),
  clearBufferfv: vi.fn(),
  clearBufferiv: vi.fn(),
  clearBufferuiv: vi.fn(),
  clearBufferfi: vi.fn(),
  isQuery: vi.fn(() => false),
  isSampler: vi.fn(() => false),
  isSync: vi.fn(() => false),
  isTransformFeedback: vi.fn(() => false),
  isVertexArray: vi.fn(() => false),
  pauseTransformFeedback: vi.fn(),
  resumeTransformFeedback: vi.fn(),
  vertexAttribI4i: vi.fn(),
  vertexAttribI4iv: vi.fn(),
  vertexAttribI4ui: vi.fn(),
  vertexAttribI4uiv: vi.fn(),
  vertexAttribIPointer: vi.fn(),
  drawRangeElements: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type: string) => {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return mockWebGLContext;
  }
  if (type === '2d') {
    // Let vitest-canvas-mock handle 2D context
    return null;
  }
  return null;
});

// ============================================================================
// Console Error Suppression for Expected Errors
// ============================================================================

const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress React 18 act warnings in tests
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An update to') &&
    args[0].includes('was not wrapped in act')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// ============================================================================
// Fake Timers Setup
// ============================================================================

// Use fake timers by default but allow overriding in individual tests
vi.useFakeTimers({ shouldAdvanceTime: true });

// ============================================================================
// LocalStorage Mock
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// ============================================================================
// Animation Frame Mock
// ============================================================================

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  setTimeout(() => {
    const cb = rafCallbacks.get(id);
    if (cb) {
      cb(performance.now());
      rafCallbacks.delete(id);
    }
  }, 16);
  return id;
});

global.cancelAnimationFrame = vi.fn((id: number): void => {
  rafCallbacks.delete(id);
});

// ============================================================================
// Performance API Mock (for Three.js)
// ============================================================================

if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
  } as unknown as Performance;
}

// ============================================================================
// URL Mock
// ============================================================================

global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// ============================================================================
// Blob Mock
// ============================================================================

global.Blob = class MockBlob {
  parts: BlobPart[];
  options: BlobPropertyBag;
  size: number;
  type: string;

  constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
    this.parts = parts ?? [];
    this.options = options ?? {};
    this.size = 0;
    this.type = options?.type ?? '';
  }

  text(): Promise<string> {
    return Promise.resolve('');
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  bytes(): Promise<any> {
    return Promise.resolve(new Uint8Array(0));
  }

  slice(): Blob {
    return new MockBlob();
  }

  stream(): any {
    return new ReadableStream();
  }
} as unknown as typeof Blob;

// ============================================================================
// Pointer Events Mock
// ============================================================================

class MockPointerEvent extends MouseEvent {
  pointerId: number;
  width: number;
  height: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  isPrimary: boolean;

  constructor(type: string, params: PointerEventInit = {}) {
    super(type, params);
    this.pointerId = params.pointerId ?? 0;
    this.width = params.width ?? 1;
    this.height = params.height ?? 1;
    this.pressure = params.pressure ?? 0;
    this.tangentialPressure = params.tangentialPressure ?? 0;
    this.tiltX = params.tiltX ?? 0;
    this.tiltY = params.tiltY ?? 0;
    this.twist = params.twist ?? 0;
    this.pointerType = params.pointerType ?? 'mouse';
    this.isPrimary = params.isPrimary ?? false;
  }

  getCoalescedEvents(): PointerEvent[] {
    return [];
  }

  getPredictedEvents(): PointerEvent[] {
    return [];
  }
}

global.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
