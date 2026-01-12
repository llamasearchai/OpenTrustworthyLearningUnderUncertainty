/**
 * Focus Management Utilities
 *
 * Hooks and utilities for managing focus in accessible applications.
 *
 * @module lib/a11y/focus-management
 */

import { useRef, useEffect, useCallback, RefObject } from 'react';

// ============================================================================
// Constants
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ============================================================================
// Utility Functions
// ============================================================================

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((el) => {
    return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  });
}

export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] ?? null;
}

export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] ?? null;
}

export function isElementFocusable(element: HTMLElement): boolean {
  return element.matches(FOCUSABLE_SELECTOR) && element.offsetParent !== null;
}

// ============================================================================
// useFocusTrap Hook
// ============================================================================

export interface UseFocusTrapOptions {
  enabled?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    autoFocus = true,
    restoreFocus = true,
    initialFocus,
    finalFocus,
    onEscape,
  } = options;

  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Auto focus
    if (autoFocus) {
      const target = initialFocus?.current ?? getFirstFocusable(container);
      target?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (activeElement === lastElement || !container.contains(activeElement)) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (restoreFocus) {
        const target = finalFocus?.current ?? previousActiveElement.current;
        if (target && isElementFocusable(target)) {
          target.focus();
        }
      }
    };
  }, [enabled, autoFocus, restoreFocus, containerRef, initialFocus, finalFocus, onEscape]);
}

// ============================================================================
// useFocusReturn Hook
// ============================================================================

export function useFocusReturn(shouldRestore: boolean = true) {
  const previousElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousElement.current = document.activeElement as HTMLElement;

    return () => {
      if (shouldRestore && previousElement.current && isElementFocusable(previousElement.current)) {
        previousElement.current.focus();
      }
    };
  }, [shouldRestore]);

  const restore = useCallback(() => {
    if (previousElement.current && isElementFocusable(previousElement.current)) {
      previousElement.current.focus();
    }
  }, []);

  return { restore };
}

// ============================================================================
// useFocusVisible Hook
// ============================================================================

export function useFocusVisible() {
  const isKeyboardNavigation = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        isKeyboardNavigation.current = true;
      }
    };

    const handleMouseDown = () => {
      isKeyboardNavigation.current = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { isKeyboardNavigation };
}

// ============================================================================
// useRovingTabIndex Hook
// ============================================================================

export interface UseRovingTabIndexOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onFocusChange?: (index: number) => void;
}

export function useRovingTabIndex<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  itemSelector: string,
  options: UseRovingTabIndexOptions = {}
) {
  const { orientation = 'vertical', loop = true, onFocusChange } = options;
  const currentIndex = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getItems = () => Array.from(container.querySelectorAll<HTMLElement>(itemSelector));

    const updateTabIndex = (items: HTMLElement[], activeIndex: number) => {
      items.forEach((item, index) => {
        item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
      });
    };

    const moveFocus = (direction: number) => {
      const items = getItems();
      if (items.length === 0) return;

      let newIndex = currentIndex.current + direction;

      if (loop) {
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
      } else {
        newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      }

      currentIndex.current = newIndex;
      updateTabIndex(items, newIndex);
      items[newIndex]?.focus();
      onFocusChange?.(newIndex);
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
          currentIndex.current = 0;
          moveFocus(0);
          break;
        case 'End':
          event.preventDefault();
          const items = getItems();
          currentIndex.current = items.length - 1;
          moveFocus(0);
          break;
      }
    };

    // Initialize tabindex
    const items = getItems();
    updateTabIndex(items, currentIndex.current);

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector, orientation, loop, onFocusChange]);

  const setFocusIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
      if (index < 0 || index >= items.length) return;

      currentIndex.current = index;
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });
      items[index]?.focus();
      onFocusChange?.(index);
    },
    [containerRef, itemSelector, onFocusChange]
  );

  return { setFocusIndex };
}

// ============================================================================
// useFocusWithin Hook
// ============================================================================

export function useFocusWithin<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  const focusedWithin = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = () => {
      focusedWithin.current = true;
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node)) {
        focusedWithin.current = false;
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [containerRef]);

  return { focusedWithin };
}
