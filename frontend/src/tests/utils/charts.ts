/**
 * Chart Test Utilities
 *
 * Utilities for testing D3.js, Visx, and Recharts visualizations.
 *
 * @module tests/utils/charts
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';

// ============================================================================
// Types
// ============================================================================

export interface ChartElements {
  paths: SVGPathElement[];
  circles: SVGCircleElement[];
  rects: SVGRectElement[];
  texts: SVGTextElement[];
  lines: SVGLineElement[];
  groups: SVGGElement[];
  svg: SVGSVGElement | null;
}

export interface BrushSelection {
  x: [number, number];
  y?: [number, number];
}

export interface TooltipContent {
  element: HTMLElement | null;
  text: string | null;
  values: Record<string, string>;
}

export interface DataPoint {
  x: number;
  y: number;
  element?: Element;
}

// ============================================================================
// Get Chart Elements
// ============================================================================

/**
 * Gets all SVG elements from a chart container.
 * Useful for asserting chart structure and data visualization.
 */
export function getChartElements(container: HTMLElement): ChartElements {
  const svg = container.querySelector('svg');

  return {
    paths: Array.from(container.querySelectorAll('path')),
    circles: Array.from(container.querySelectorAll('circle')),
    rects: Array.from(container.querySelectorAll('rect')),
    texts: Array.from(container.querySelectorAll('text')),
    lines: Array.from(container.querySelectorAll('line')),
    groups: Array.from(container.querySelectorAll('g')),
    svg,
  };
}

/**
 * Gets data paths from a line chart (excluding axis paths).
 */
export function getDataPaths(container: HTMLElement): SVGPathElement[] {
  const elements = getChartElements(container);
  // Filter out axis-related paths (usually have specific classes or patterns)
  return elements.paths.filter((path) => {
    const d = path.getAttribute('d') ?? '';
    const className = path.getAttribute('class') ?? '';
    // Exclude tick marks (very short paths) and grid lines
    return !className.includes('tick') &&
           !className.includes('domain') &&
           !className.includes('grid') &&
           d.length > 20; // Data paths are usually longer
  });
}

/**
 * Gets data points (circles) from a scatter plot or line chart with markers.
 */
export function getDataPoints(container: HTMLElement): SVGCircleElement[] {
  const elements = getChartElements(container);
  return elements.circles.filter((circle) => {
    const className = circle.getAttribute('class') ?? '';
    // Exclude circles used for other purposes (like legend markers)
    return !className.includes('legend') && !className.includes('cursor');
  });
}

/**
 * Gets data bars from a bar chart.
 */
export function getDataBars(container: HTMLElement): SVGRectElement[] {
  const elements = getChartElements(container);
  return elements.rects.filter((rect) => {
    const className = rect.getAttribute('class') ?? '';
    // Exclude background rects, brush rects, etc.
    return !className.includes('background') &&
           !className.includes('brush') &&
           !className.includes('overlay') &&
           rect.getAttribute('height') !== '0';
  });
}

// ============================================================================
// Simulate Brush
// ============================================================================

/**
 * Simulates a brush selection on a chart.
 * Works with D3.js brush and Visx brush implementations.
 */
export function simulateBrush(
  container: HTMLElement,
  selection: BrushSelection
): void {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found in container');
  }

  const brushOverlay = container.querySelector('.brush .overlay') ??
                       container.querySelector('[class*="brush"]') ??
                       svg;

  const rect = svg.getBoundingClientRect();

  // Calculate pixel positions from normalized values
  const startX = selection.x[0] * rect.width;
  const endX = selection.x[1] * rect.width;
  const startY = selection.y ? selection.y[0] * rect.height : rect.height / 2;
  const endY = selection.y ? selection.y[1] * rect.height : rect.height / 2;

  // Simulate mouse events for brush
  fireEvent.mouseDown(brushOverlay, {
    clientX: rect.left + startX,
    clientY: rect.top + startY,
    bubbles: true,
  });

  fireEvent.mouseMove(document, {
    clientX: rect.left + endX,
    clientY: rect.top + endY,
    bubbles: true,
  });

  fireEvent.mouseUp(document, {
    clientX: rect.left + endX,
    clientY: rect.top + endY,
    bubbles: true,
  });
}

/**
 * Clears the brush selection.
 */
export function clearBrush(container: HTMLElement): void {
  const brushOverlay = container.querySelector('.brush .overlay') ??
                       container.querySelector('[class*="brush"]');

  if (brushOverlay) {
    fireEvent.doubleClick(brushOverlay);
  }
}

// ============================================================================
// Tooltip Utilities
// ============================================================================

/**
 * Gets the tooltip content from a chart.
 * Supports various tooltip implementations.
 */
export function getTooltipContent(container?: HTMLElement): TooltipContent {
  // Look for tooltip in container or body
  const searchRoot = container ?? document.body;

  // Common tooltip selectors
  const tooltipSelectors = [
    '[role="tooltip"]',
    '.recharts-tooltip-wrapper',
    '.visx-tooltip',
    '[class*="tooltip"]',
    '[data-testid="chart-tooltip"]',
  ];

  let tooltipElement: HTMLElement | null = null;
  for (const selector of tooltipSelectors) {
    tooltipElement = searchRoot.querySelector(selector);
    if (tooltipElement) break;
  }

  if (!tooltipElement) {
    // Check if tooltip is in a portal
    for (const selector of tooltipSelectors) {
      tooltipElement = document.body.querySelector(selector);
      if (tooltipElement) break;
    }
  }

  if (!tooltipElement) {
    return { element: null, text: null, values: {} };
  }

  const text = tooltipElement.textContent;
  const values: Record<string, string> = {};

  // Try to extract key-value pairs from tooltip
  const labelElements = tooltipElement.querySelectorAll('.recharts-tooltip-label, [class*="label"]');
  const valueElements = tooltipElement.querySelectorAll('.recharts-tooltip-item, [class*="value"]');

  labelElements.forEach((label, index) => {
    const value = valueElements[index]?.textContent ?? '';
    if (label.textContent) {
      values[label.textContent.trim()] = value.trim();
    }
  });

  return {
    element: tooltipElement,
    text,
    values,
  };
}

/**
 * Triggers tooltip display by hovering over a chart element.
 */
export async function hoverForTooltip(
  element: Element,
  options?: { timeout?: number }
): Promise<TooltipContent> {
  fireEvent.mouseEnter(element);
  fireEvent.mouseOver(element);

  // Wait for tooltip to appear
  await waitFor(
    () => {
      const tooltip = getTooltipContent();
      if (!tooltip.element) {
        throw new Error('Tooltip not found');
      }
      return tooltip;
    },
    { timeout: options?.timeout ?? 3000 }
  );

  return getTooltipContent();
}

/**
 * Hides the tooltip by moving mouse away.
 */
export function hideTooltip(element: Element): void {
  fireEvent.mouseLeave(element);
  fireEvent.mouseOut(element);
}

// ============================================================================
// Axis Assertions
// ============================================================================

/**
 * Asserts that axis labels match expected values.
 */
export function assertAxisLabels(
  container: HTMLElement,
  expectedLabels: string[],
  axis: 'x' | 'y' = 'x'
): void {
  const elements = getChartElements(container);

  // Find axis group
  const axisSelector = axis === 'x' ? '.x-axis, .xAxis, [class*="x-axis"]' : '.y-axis, .yAxis, [class*="y-axis"]';
  const axisGroup = container.querySelector(axisSelector);

  let tickTexts: string[];

  if (axisGroup) {
    tickTexts = Array.from(axisGroup.querySelectorAll('text'))
      .map((t) => t.textContent?.trim() ?? '');
  } else {
    // Fallback: try to find axis texts by position
    tickTexts = elements.texts
      .filter((text) => {
        const className = text.getAttribute('class') ?? '';
        const transform = text.getAttribute('transform') ?? '';
        if (axis === 'x') {
          return className.includes('x') || className.includes('bottom') ||
                 (!className.includes('y') && !className.includes('left'));
        }
        return className.includes('y') || className.includes('left') ||
               transform.includes('rotate');
      })
      .map((t) => t.textContent?.trim() ?? '');
  }

  const filteredLabels = tickTexts.filter((label) => label.length > 0);

  for (const expected of expectedLabels) {
    const found = filteredLabels.some((label) =>
      label.includes(expected) || expected.includes(label)
    );
    if (!found) {
      throw new Error(`Expected axis label "${expected}" not found. Found: ${filteredLabels.join(', ')}`);
    }
  }
}

/**
 * Asserts the axis title.
 */
export function assertAxisTitle(
  container: HTMLElement,
  expectedTitle: string,
  axis: 'x' | 'y' = 'x'
): void {
  const elements = getChartElements(container);

  const titleText = elements.texts.find((text) => {
    const content = text.textContent?.trim() ?? '';
    const className = text.getAttribute('class') ?? '';
    return content.includes(expectedTitle) ||
           (className.includes(axis) && className.includes('title'));
  });

  if (!titleText) {
    throw new Error(`Expected ${axis}-axis title "${expectedTitle}" not found`);
  }
}

// ============================================================================
// Data Point Assertions
// ============================================================================

/**
 * Asserts that data points exist at expected positions.
 */
export function assertDataPoints(
  container: HTMLElement,
  expectedCount: number,
  tolerance: number = 0
): void {
  const dataPoints = getDataPoints(container);
  const dataBars = getDataBars(container);
  const dataPaths = getDataPaths(container);

  const totalPoints = dataPoints.length + dataBars.length;
  const hasPath = dataPaths.length > 0;

  if (hasPath && totalPoints === 0) {
    // Line chart without markers - check if path exists
    if (dataPaths.length === 0) {
      throw new Error('Expected data path but none found');
    }
    return;
  }

  if (tolerance > 0) {
    if (totalPoints < expectedCount - tolerance || totalPoints > expectedCount + tolerance) {
      throw new Error(
        `Expected ${expectedCount} data points (tolerance: ${tolerance}), but found ${totalPoints}`
      );
    }
  } else {
    if (totalPoints !== expectedCount) {
      throw new Error(`Expected ${expectedCount} data points, but found ${totalPoints}`);
    }
  }
}

/**
 * Gets the position of a data point element.
 */
export function getDataPointPosition(element: SVGCircleElement | SVGRectElement): DataPoint {
  if (element instanceof SVGCircleElement) {
    return {
      x: parseFloat(element.getAttribute('cx') ?? '0'),
      y: parseFloat(element.getAttribute('cy') ?? '0'),
      element,
    };
  }

  // For rect (bar chart)
  const x = parseFloat(element.getAttribute('x') ?? '0');
  const y = parseFloat(element.getAttribute('y') ?? '0');
  const width = parseFloat(element.getAttribute('width') ?? '0');
  const height = parseFloat(element.getAttribute('height') ?? '0');

  return {
    x: x + width / 2,
    y: y + height / 2,
    element,
  };
}

// ============================================================================
// Legend Assertions
// ============================================================================

/**
 * Asserts legend items exist with expected labels.
 */
export function assertLegendItems(
  container: HTMLElement,
  expectedLabels: string[]
): void {
  const legendSelectors = [
    '.recharts-legend-item',
    '.visx-legend-item',
    '[class*="legend-item"]',
    '[data-testid="legend-item"]',
  ];

  let legendItems: Element[] = [];
  for (const selector of legendSelectors) {
    legendItems = Array.from(container.querySelectorAll(selector));
    if (legendItems.length > 0) break;
  }

  const legendLabels = legendItems.map((item) => item.textContent?.trim() ?? '');

  for (const expected of expectedLabels) {
    const found = legendLabels.some((label) =>
      label.includes(expected) || expected.includes(label)
    );
    if (!found) {
      throw new Error(`Expected legend item "${expected}" not found. Found: ${legendLabels.join(', ')}`);
    }
  }
}

/**
 * Clicks a legend item to toggle series visibility.
 */
export async function clickLegendItem(
  container: HTMLElement,
  label: string
): Promise<void> {
  const legendSelectors = [
    '.recharts-legend-item',
    '.visx-legend-item',
    '[class*="legend-item"]',
    '[data-testid="legend-item"]',
  ];

  let legendItem: Element | null = null;

  for (const selector of legendSelectors) {
    const items = Array.from(container.querySelectorAll(selector));
    legendItem = items.find((item) => item.textContent?.includes(label)) ?? null;
    if (legendItem) break;
  }

  if (!legendItem) {
    throw new Error(`Legend item "${label}" not found`);
  }

  fireEvent.click(legendItem);
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Gets the color of a chart element.
 */
export function getElementColor(element: Element): string | null {
  return (
    element.getAttribute('fill') ??
    element.getAttribute('stroke') ??
    (element as HTMLElement).style?.fill ??
    (element as HTMLElement).style?.stroke ??
    null
  );
}

/**
 * Asserts elements have expected colors.
 */
export function assertElementColors(
  elements: Element[],
  expectedColors: string[]
): void {
  const colors = elements
    .map(getElementColor)
    .filter((c): c is string => c !== null);

  for (const expected of expectedColors) {
    const normalizedExpected = expected.toLowerCase();
    const found = colors.some((color) => {
      const normalizedColor = color.toLowerCase();
      return normalizedColor === normalizedExpected ||
             normalizedColor.includes(normalizedExpected);
    });

    if (!found) {
      throw new Error(`Expected color "${expected}" not found. Found: ${colors.join(', ')}`);
    }
  }
}

// ============================================================================
// Chart Interaction Utilities
// ============================================================================

/**
 * Simulates zoom on a chart.
 */
export function simulateZoom(
  container: HTMLElement,
  direction: 'in' | 'out',
  factor: number = 0.5
): void {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found');
  }

  const rect = svg.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const delta = direction === 'in' ? -100 : 100;

  fireEvent.wheel(svg, {
    clientX: centerX,
    clientY: centerY,
    deltaY: delta * factor,
    bubbles: true,
  });
}

/**
 * Simulates pan on a chart.
 */
export function simulatePan(
  container: HTMLElement,
  deltaX: number,
  deltaY: number
): void {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found');
  }

  const rect = svg.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  fireEvent.mouseDown(svg, {
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });

  fireEvent.mouseMove(document, {
    clientX: startX + deltaX,
    clientY: startY + deltaY,
    bubbles: true,
  });

  fireEvent.mouseUp(document, {
    clientX: startX + deltaX,
    clientY: startY + deltaY,
    bubbles: true,
  });
}

// ============================================================================
// Accessibility Assertions
// ============================================================================

/**
 * Asserts chart has proper accessibility attributes.
 */
export function assertChartAccessibility(
  container: HTMLElement,
  options?: {
    title?: string;
    description?: string;
  }
): void {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found');
  }

  // Check for role
  const role = svg.getAttribute('role');
  if (!role || role !== 'img') {
    // Some charts use other roles like 'graphics-document'
    const ariaLabel = svg.getAttribute('aria-label');
    const ariaDescribedBy = svg.getAttribute('aria-describedby');
    const title = svg.querySelector('title');
    const desc = svg.querySelector('desc');

    if (!ariaLabel && !ariaDescribedBy && !title) {
      console.warn('Chart SVG should have accessible label (aria-label, aria-describedby, or title element)');
    }

    if (options?.title) {
      const titleText = ariaLabel ?? title?.textContent ?? '';
      if (!titleText.includes(options.title)) {
        throw new Error(`Expected chart title "${options.title}" not found in accessibility attributes`);
      }
    }

    if (options?.description && desc) {
      if (!desc.textContent?.includes(options.description)) {
        throw new Error(`Expected chart description "${options.description}" not found`);
      }
    }
  }
}

// ============================================================================
// Recharts-Specific Utilities
// ============================================================================

/**
 * Gets Recharts-specific elements.
 */
export function getRechartsElements(container: HTMLElement) {
  return {
    wrapper: container.querySelector('.recharts-wrapper'),
    surface: container.querySelector('.recharts-surface'),
    legend: container.querySelector('.recharts-legend-wrapper'),
    tooltip: container.querySelector('.recharts-tooltip-wrapper'),
    xAxis: container.querySelector('.recharts-xAxis'),
    yAxis: container.querySelector('.recharts-yAxis'),
    cartesianGrid: container.querySelector('.recharts-cartesian-grid'),
    lines: Array.from(container.querySelectorAll('.recharts-line')),
    bars: Array.from(container.querySelectorAll('.recharts-bar')),
    areas: Array.from(container.querySelectorAll('.recharts-area')),
    pie: container.querySelector('.recharts-pie'),
  };
}

// ============================================================================
// Visx-Specific Utilities
// ============================================================================

/**
 * Gets Visx-specific elements.
 */
export function getVisxElements(container: HTMLElement) {
  return {
    svg: container.querySelector('svg'),
    axes: {
      left: container.querySelector('.visx-axis-left'),
      bottom: container.querySelector('.visx-axis-bottom'),
      top: container.querySelector('.visx-axis-top'),
      right: container.querySelector('.visx-axis-right'),
    },
    grid: container.querySelector('.visx-group'),
    brush: container.querySelector('.visx-brush'),
    tooltip: document.querySelector('.visx-tooltip'),
    legend: container.querySelector('.visx-legend'),
  };
}

// ============================================================================
// Export all utilities
// ============================================================================

export {
  fireEvent,
  screen,
  waitFor,
};
