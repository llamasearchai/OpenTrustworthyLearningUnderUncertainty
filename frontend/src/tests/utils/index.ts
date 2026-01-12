/**
 * Test Utilities Index
 *
 * Central export for all test utilities.
 *
 * @module tests/utils
 */

// ============================================================================
// Render Utilities
// ============================================================================

export {
  // Custom render
  render,
  customRender,
  createTestQueryClient,

  // Wait utilities
  waitForLoadingToFinish,
  waitForToast,
  waitForModal,
  waitForModalToClose,
  waitForElement,
  waitForElementToBeRemoved,

  // Form helpers
  fillForm,
  submitForm,
  selectOption,

  // Keyboard helpers
  pressKey,
  pressKeys,

  // Accessibility
  assertNoAccessibilityViolations,

  // Context providers
  ThemeContext,
  ThemeProvider,
  ToastContext,
  ToastProvider,

  // Re-exports from testing-library
  screen,
  waitFor,
  fireEvent,
  within,
  userEvent,

  // Types
  type CustomRenderOptions,
} from './render';

// ============================================================================
// Three.js Utilities
// ============================================================================

export {
  // Canvas and renderer
  createMockCanvas,
  MockWebGLRenderer,

  // Scene utilities
  createMockScene,
  createMockMesh,
  createMockGroup,
  createMockCamera,
  createTestGeometry,

  // Event simulation
  simulatePointerEvent3D,
  simulateClick3D,
  simulateDrag3D,

  // Raycasting
  raycastFromScreen,

  // Animation
  advanceFrames,
  nextFrame,

  // Three.js re-export
  THREE,

  // Types
  type MockCanvasOptions,
  type PointerEvent3DOptions,
  type MockRendererOptions,
} from './three';

// ============================================================================
// Chart Utilities
// ============================================================================

export {
  // Element getters
  getChartElements,
  getDataPaths,
  getDataPoints,
  getDataBars,

  // Brush simulation
  simulateBrush,
  clearBrush,

  // Tooltip utilities
  getTooltipContent,
  hoverForTooltip,
  hideTooltip,

  // Axis assertions
  assertAxisLabels,
  assertAxisTitle,

  // Data point assertions
  assertDataPoints,
  getDataPointPosition,

  // Legend utilities
  assertLegendItems,
  clickLegendItem,

  // Color utilities
  getElementColor,
  assertElementColors,

  // Interaction utilities
  simulateZoom,
  simulatePan,

  // Accessibility
  assertChartAccessibility,

  // Framework-specific
  getRechartsElements,
  getVisxElements,

  // Types
  type ChartElements,
  type BrushSelection,
  type TooltipContent,
  type DataPoint,
} from './charts';
