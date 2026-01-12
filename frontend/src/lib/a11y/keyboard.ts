/**
 * Keyboard Navigation Utilities
 *
 * Hooks and utilities for keyboard navigation and shortcuts.
 *
 * @module lib/a11y/keyboard
 */

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';
export type KeyboardModifiers = Partial<Record<ModifierKey, boolean>>;

export interface KeyBinding {
  key: string;
  modifiers?: KeyboardModifiers;
  description?: string;
  action: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
  category?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const KEY_CODES = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

export function parseKeyBinding(binding: string): { key: string; modifiers: KeyboardModifiers } {
  const parts = binding.toLowerCase().split('+').map((p) => p.trim());
  const modifiers: KeyboardModifiers = {};
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        modifiers.ctrl = true;
        break;
      case 'alt':
      case 'option':
        modifiers.alt = true;
        break;
      case 'shift':
        modifiers.shift = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        modifiers.meta = true;
        break;
      default:
        key = part;
    }
  }

  return { key, modifiers };
}

export function formatKeyBinding(key: string, modifiers?: KeyboardModifiers): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const parts: string[] = [];

  if (modifiers?.meta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (modifiers?.ctrl && !isMac) parts.push('Ctrl');
  if (modifiers?.ctrl && isMac) parts.push('⌃');
  if (modifiers?.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (modifiers?.shift) parts.push(isMac ? '⇧' : 'Shift');

  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join(isMac ? '' : '+');
}

export function matchesKeyBinding(event: KeyboardEvent, key: string, modifiers?: KeyboardModifiers): boolean {
  const eventKey = event.key.toLowerCase();
  const targetKey = key.toLowerCase();

  if (eventKey !== targetKey && event.code.toLowerCase() !== targetKey) {
    return false;
  }

  const ctrlMatch = (modifiers?.ctrl ?? false) === (event.ctrlKey || event.metaKey);
  const altMatch = (modifiers?.alt ?? false) === event.altKey;
  const shiftMatch = (modifiers?.shift ?? false) === event.shiftKey;
  const metaMatch = (modifiers?.meta ?? false) === event.metaKey;

  // For meta modifier on Mac, also check ctrlKey for cross-platform support
  if (modifiers?.meta !== undefined) {
    return ctrlMatch && altMatch && shiftMatch && metaMatch;
  }

  return ctrlMatch && altMatch && shiftMatch;
}

// ============================================================================
// useKeyBindings Hook
// ============================================================================

export interface UseKeyBindingsOptions {
  enabled?: boolean;
  target?: HTMLElement | Document | Window | null;
  eventType?: 'keydown' | 'keyup';
}

export function useKeyBindings(bindings: KeyBinding[], options: UseKeyBindingsOptions = {}) {
  const { enabled = true, target = typeof document !== 'undefined' ? document : null, eventType = 'keydown' } = options;

  useEffect(() => {
    if (!enabled || !target) return;

    const handleKeyEvent = (event: Event) => {
      const keyEvent = event as KeyboardEvent;

      // Skip if typing in an input field
      const activeElement = document.activeElement;
      const isInputField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      for (const binding of bindings) {
        if (binding.enabled === false) continue;

        if (matchesKeyBinding(keyEvent, binding.key, binding.modifiers)) {
          // Allow shortcuts with modifiers in input fields
          const hasModifiers = binding.modifiers && Object.values(binding.modifiers).some(Boolean);
          if (isInputField && !hasModifiers) continue;

          if (binding.preventDefault !== false) {
            keyEvent.preventDefault();
          }
          if (binding.stopPropagation) {
            keyEvent.stopPropagation();
          }

          binding.action(keyEvent);
          return;
        }
      }
    };

    (target as EventTarget).addEventListener(eventType, handleKeyEvent);

    return () => {
      (target as EventTarget).removeEventListener(eventType, handleKeyEvent);
    };
  }, [bindings, enabled, target, eventType]);
}

// ============================================================================
// useKeyboardShortcut Hook
// ============================================================================

export function useKeyboardShortcut(
  binding: string,
  action: (event: KeyboardEvent) => void,
  options: Omit<UseKeyBindingsOptions, 'target'> & { enabled?: boolean } = {}
) {
  const { key, modifiers } = parseKeyBinding(binding);

  useKeyBindings(
    [
      {
        key,
        modifiers,
        action,
        enabled: options.enabled,
      },
    ],
    options
  );
}

// ============================================================================
// useEscapeKey Hook
// ============================================================================

export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useKeyboardShortcut('Escape', onEscape, { enabled });
}

// ============================================================================
// useArrowKeys Hook
// ============================================================================

export interface UseArrowKeysOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  enabled?: boolean;
}

export function useArrowKeys(options: UseArrowKeysOptions) {
  const { onUp, onDown, onLeft, onRight, enabled = true } = options;

  const bindings: KeyBinding[] = [];

  if (onUp) bindings.push({ key: 'ArrowUp', action: onUp });
  if (onDown) bindings.push({ key: 'ArrowDown', action: onDown });
  if (onLeft) bindings.push({ key: 'ArrowLeft', action: onLeft });
  if (onRight) bindings.push({ key: 'ArrowRight', action: onRight });

  useKeyBindings(bindings, { enabled });
}

// ============================================================================
// Keyboard Shortcuts Registry
// ============================================================================

class ShortcutsRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Set<() => void> = new Set();

  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.notifyListeners();
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
    this.notifyListeners();
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getByCategory(): Map<string, KeyboardShortcut[]> {
    const byCategory = new Map<string, KeyboardShortcut[]>();

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
}

export const shortcutsRegistry = new ShortcutsRegistry();

// ============================================================================
// useRegisterShortcut Hook
// ============================================================================

export function useRegisterShortcut(
  id: string,
  keys: string,
  description: string,
  action: (event: KeyboardEvent) => void,
  options: { category?: string; enabled?: boolean } = {}
) {
  const { category, enabled = true } = options;

  useEffect(() => {
    if (enabled) {
      shortcutsRegistry.register({ id, keys, description, category });
    }

    return () => {
      shortcutsRegistry.unregister(id);
    };
  }, [id, keys, description, category, enabled]);

  useKeyboardShortcut(keys, action, { enabled });
}

// ============================================================================
// useShortcutsList Hook
// ============================================================================

export function useShortcutsList() {
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  useEffect(() => {
    const updateShortcuts = () => {
      shortcutsRef.current = shortcutsRegistry.getAll();
    };

    updateShortcuts();
    return shortcutsRegistry.subscribe(updateShortcuts);
  }, []);

  const getShortcuts = useCallback(() => shortcutsRegistry.getAll(), []);
  const getByCategory = useCallback(() => shortcutsRegistry.getByCategory(), []);

  return { getShortcuts, getByCategory };
}
