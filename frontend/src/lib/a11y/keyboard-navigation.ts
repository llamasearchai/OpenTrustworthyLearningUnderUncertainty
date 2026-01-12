/**
 * Keyboard Navigation Utilities
 *
 * Additional hooks and utilities for keyboard navigation patterns.
 *
 * @module lib/a11y/keyboard-navigation
 */

import { useRef, useEffect, useCallback, RefObject } from 'react';
import { getFocusableElements } from './focus-management';

// ============================================================================
// Types
// ============================================================================

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'first' | 'last';
export type Orientation = 'horizontal' | 'vertical' | 'both';

export interface GridPosition {
  row: number;
  col: number;
}

export interface ShortcutRegistration {
  id: string;
  keyCombo: string;
  callback: (event: KeyboardEvent) => void;
  description: string;
  category?: string;
  enabled?: boolean;
}

// ============================================================================
// Shortcut Registry
// ============================================================================

class GlobalShortcutRegistry {
  private shortcuts: Map<string, ShortcutRegistration> = new Map();
  private listeners: Set<() => void> = new Set();
  private boundHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.boundHandler = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.boundHandler);
    }
  }

  private parseKeyCombo(combo: string): {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  } {
    const parts = combo.toLowerCase().split('+').map((p) => p.trim());
    let key = '';
    let ctrl = false;
    let alt = false;
    let shift = false;
    let meta = false;

    for (const part of parts) {
      switch (part) {
        case 'ctrl':
        case 'control':
          ctrl = true;
          break;
        case 'alt':
        case 'option':
          alt = true;
          break;
        case 'shift':
          shift = true;
          break;
        case 'meta':
        case 'cmd':
        case 'command':
          meta = true;
          break;
        default:
          key = part;
      }
    }

    return { key, ctrl, alt, shift, meta };
  }

  private matchesKeyCombo(
    event: KeyboardEvent,
    combo: ReturnType<typeof this.parseKeyCombo>
  ): boolean {
    const eventKey = event.key.toLowerCase();
    const targetKey = combo.key.toLowerCase();

    if (eventKey !== targetKey && event.code.toLowerCase() !== targetKey) {
      return false;
    }

    return (
      combo.ctrl === (event.ctrlKey || event.metaKey) &&
      combo.alt === event.altKey &&
      combo.shift === event.shiftKey &&
      combo.meta === event.metaKey
    );
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Skip if typing in an input field without modifiers
    const activeElement = document.activeElement;
    const isInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement ||
      (activeElement as HTMLElement)?.isContentEditable;

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.enabled === false) continue;

      const parsed = this.parseKeyCombo(shortcut.keyCombo);
      if (this.matchesKeyCombo(event, parsed)) {
        const hasModifiers = parsed.ctrl || parsed.alt || parsed.meta;
        if (isInputField && !hasModifiers) continue;

        event.preventDefault();
        event.stopPropagation();
        shortcut.callback(event);
        return;
      }
    }
  }

  register(shortcut: ShortcutRegistration): () => void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.notifyListeners();

    return () => {
      this.shortcuts.delete(shortcut.id);
      this.notifyListeners();
    };
  }

  update(id: string, updates: Partial<ShortcutRegistration>): void {
    const existing = this.shortcuts.get(id);
    if (existing) {
      this.shortcuts.set(id, { ...existing, ...updates });
      this.notifyListeners();
    }
  }

  getAll(): ShortcutRegistration[] {
    return Array.from(this.shortcuts.values());
  }

  getByCategory(): Map<string, ShortcutRegistration[]> {
    const byCategory = new Map<string, ShortcutRegistration[]>();

    for (const shortcut of this.shortcuts.values()) {
      const category = shortcut.category ?? 'General';
      const existing = byCategory.get(category) ?? [];
      existing.push(shortcut);
      byCategory.set(category, existing);
    }

    return byCategory;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  destroy(): void {
    if (this.boundHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.boundHandler);
    }
    this.shortcuts.clear();
    this.listeners.clear();
  }
}

export const globalShortcutRegistry = new GlobalShortcutRegistry();

// ============================================================================
// registerShortcut Function
// ============================================================================

/**
 * Register a global keyboard shortcut
 *
 * @param keyCombo - Key combination (e.g., "ctrl+k", "meta+shift+p")
 * @param callback - Function to call when shortcut is triggered
 * @param description - Human-readable description
 * @param options - Additional options
 * @returns Unregister function
 *
 * @example
 * ```tsx
 * const unregister = registerShortcut(
 *   'ctrl+k',
 *   () => openCommandPalette(),
 *   'Open command palette',
 *   { category: 'Navigation' }
 * );
 *
 * // Later: unregister()
 * ```
 */
export function registerShortcut(
  keyCombo: string,
  callback: (event: KeyboardEvent) => void,
  description: string,
  options: { id?: string; category?: string; enabled?: boolean } = {}
): () => void {
  const id = options.id ?? `shortcut-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return globalShortcutRegistry.register({
    id,
    keyCombo,
    callback,
    description,
    category: options.category,
    enabled: options.enabled ?? true,
  });
}

// ============================================================================
// useShortcuts Hook
// ============================================================================

/**
 * Hook to get all registered shortcuts
 */
export function useShortcuts() {
  const shortcutsRef = useRef<ShortcutRegistration[]>([]);

  useEffect(() => {
    const updateShortcuts = () => {
      shortcutsRef.current = globalShortcutRegistry.getAll();
    };

    updateShortcuts();
    return globalShortcutRegistry.subscribe(updateShortcuts);
  }, []);

  const getShortcuts = useCallback(() => globalShortcutRegistry.getAll(), []);
  const getByCategory = useCallback(() => globalShortcutRegistry.getByCategory(), []);

  return { getShortcuts, getByCategory };
}

// ============================================================================
// useRovingTabindex Hook
// ============================================================================

export interface UseRovingTabindexOptions {
  orientation?: Orientation;
  loop?: boolean;
  onFocusChange?: (index: number, element: HTMLElement) => void;
  initialIndex?: number;
}

/**
 * Hook for roving tabindex pattern
 *
 * @example
 * ```tsx
 * function Toolbar() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { setFocusIndex, currentIndex } = useRovingTabindex(
 *     containerRef,
 *     '[role="button"]',
 *     { orientation: 'horizontal' }
 *   );
 *
 *   return (
 *     <div ref={containerRef} role="toolbar">
 *       <button role="button">Cut</button>
 *       <button role="button">Copy</button>
 *       <button role="button">Paste</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRovingTabindex<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  itemSelector: string,
  options: UseRovingTabindexOptions = {}
) {
  const {
    orientation = 'vertical',
    loop = true,
    onFocusChange,
    initialIndex = 0,
  } = options;

  const currentIndexRef = useRef(initialIndex);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getItems = () =>
      Array.from(container.querySelectorAll<HTMLElement>(itemSelector));

    const updateTabIndex = (items: HTMLElement[], activeIndex: number) => {
      items.forEach((item, index) => {
        item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
      });
    };

    const moveFocus = (direction: number) => {
      const items = getItems();
      if (items.length === 0) return;

      let newIndex = currentIndexRef.current + direction;

      if (loop) {
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
      } else {
        newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      }

      currentIndexRef.current = newIndex;
      updateTabIndex(items, newIndex);
      items[newIndex]?.focus();
      onFocusChange?.(newIndex, items[newIndex]);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      switch (event.key) {
        case 'ArrowUp':
          if (isVertical) {
            event.preventDefault();
            moveFocus(-1);
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            event.preventDefault();
            moveFocus(1);
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            event.preventDefault();
            moveFocus(-1);
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            event.preventDefault();
            moveFocus(1);
          }
          break;
        case 'Home':
          event.preventDefault();
          currentIndexRef.current = -1;
          moveFocus(1);
          break;
        case 'End':
          event.preventDefault();
          const items = getItems();
          currentIndexRef.current = items.length;
          moveFocus(-1);
          break;
      }
    };

    // Initialize tabindex
    const items = getItems();
    updateTabIndex(items, currentIndexRef.current);

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector, orientation, loop, onFocusChange]);

  const setFocusIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(itemSelector)
      );
      if (index < 0 || index >= items.length) return;

      currentIndexRef.current = index;
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });
      items[index]?.focus();
      onFocusChange?.(index, items[index]);
    },
    [containerRef, itemSelector, onFocusChange]
  );

  const getCurrentIndex = useCallback(() => currentIndexRef.current, []);

  return { setFocusIndex, getCurrentIndex };
}

// ============================================================================
// useArrowNavigation Hook (Grid Navigation)
// ============================================================================

export interface UseArrowNavigationOptions {
  columns: number;
  rows?: number;
  loop?: boolean;
  onPositionChange?: (position: GridPosition, element: HTMLElement | null) => void;
  initialPosition?: GridPosition;
}

/**
 * Hook for grid-based arrow key navigation
 *
 * @example
 * ```tsx
 * function Calendar() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { position, setPosition } = useArrowNavigation(
 *     containerRef,
 *     '[role="gridcell"]',
 *     { columns: 7 }
 *   );
 *
 *   return (
 *     <div ref={containerRef} role="grid">
 *       {days.map((day, i) => (
 *         <div key={i} role="gridcell" tabIndex={-1}>
 *           {day}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useArrowNavigation<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  itemSelector: string,
  options: UseArrowNavigationOptions
) {
  const {
    columns,
    rows,
    loop = false,
    onPositionChange,
    initialPosition = { row: 0, col: 0 },
  } = options;

  const positionRef = useRef<GridPosition>(initialPosition);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getItems = () =>
      Array.from(container.querySelectorAll<HTMLElement>(itemSelector));

    const getElementAtPosition = (pos: GridPosition): HTMLElement | null => {
      const items = getItems();
      const index = pos.row * columns + pos.col;
      return items[index] ?? null;
    };

    const getTotalRows = (): number => {
      if (rows) return rows;
      const items = getItems();
      return Math.ceil(items.length / columns);
    };

    const updateFocus = (newPosition: GridPosition) => {
      const items = getItems();
      const totalRows = getTotalRows();

      // Clamp position
      let { row, col } = newPosition;

      if (loop) {
        if (row < 0) row = totalRows - 1;
        if (row >= totalRows) row = 0;
        if (col < 0) col = columns - 1;
        if (col >= columns) col = 0;
      } else {
        row = Math.max(0, Math.min(totalRows - 1, row));
        col = Math.max(0, Math.min(columns - 1, col));
      }

      const index = row * columns + col;
      if (index >= items.length) return;

      positionRef.current = { row, col };

      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });

      items[index]?.focus();
      onPositionChange?.({ row, col }, items[index]);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const { row, col } = positionRef.current;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          updateFocus({ row: row - 1, col });
          break;
        case 'ArrowDown':
          event.preventDefault();
          updateFocus({ row: row + 1, col });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          updateFocus({ row, col: col - 1 });
          break;
        case 'ArrowRight':
          event.preventDefault();
          updateFocus({ row, col: col + 1 });
          break;
        case 'Home':
          event.preventDefault();
          if (event.ctrlKey) {
            updateFocus({ row: 0, col: 0 });
          } else {
            updateFocus({ row, col: 0 });
          }
          break;
        case 'End':
          event.preventDefault();
          if (event.ctrlKey) {
            const totalRows = getTotalRows();
            updateFocus({ row: totalRows - 1, col: columns - 1 });
          } else {
            updateFocus({ row, col: columns - 1 });
          }
          break;
        case 'PageUp':
          event.preventDefault();
          updateFocus({ row: Math.max(0, row - 5), col });
          break;
        case 'PageDown':
          event.preventDefault();
          updateFocus({ row: row + 5, col });
          break;
      }
    };

    // Initialize
    const items = getItems();
    const initialIndex = initialPosition.row * columns + initialPosition.col;
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === initialIndex ? '0' : '-1');
    });

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector, columns, rows, loop, onPositionChange, initialPosition]);

  const setPosition = useCallback(
    (position: GridPosition) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(itemSelector)
      );
      const index = position.row * columns + position.col;

      if (index < 0 || index >= items.length) return;

      positionRef.current = position;
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });
      items[index]?.focus();
      onPositionChange?.(position, items[index]);
    },
    [containerRef, itemSelector, columns, onPositionChange]
  );

  const getPosition = useCallback(() => positionRef.current, []);

  return { position: positionRef.current, setPosition, getPosition };
}

// ============================================================================
// moveFocus Function
// ============================================================================

/**
 * Move focus in a specified direction within a container
 *
 * @param direction - Direction to move
 * @param container - Container element
 * @param currentElement - Currently focused element (optional)
 * @returns The newly focused element or null
 */
export function moveFocus(
  direction: NavigationDirection,
  container: HTMLElement,
  currentElement?: HTMLElement | null
): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return null;

  const current = currentElement ?? (document.activeElement as HTMLElement);
  const currentIndex = focusableElements.indexOf(current);

  let targetIndex: number;

  switch (direction) {
    case 'first':
      targetIndex = 0;
      break;
    case 'last':
      targetIndex = focusableElements.length - 1;
      break;
    case 'up':
    case 'left':
      targetIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      break;
    case 'down':
    case 'right':
      targetIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
      break;
    default:
      return null;
  }

  const targetElement = focusableElements[targetIndex];
  targetElement?.focus();
  return targetElement ?? null;
}

// ============================================================================
// focusFirstFocusable Function
// ============================================================================

/**
 * Focus the first focusable element within a container
 *
 * @param container - Container element
 * @returns The focused element or null
 */
export function focusFirstFocusable(container: HTMLElement): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];

  if (firstElement) {
    firstElement.focus();
    return firstElement;
  }

  return null;
}
