/**
 * Accessibility Module
 *
 * Exports all accessibility-related functionality including focus management,
 * keyboard navigation, and live region announcements.
 *
 * @module lib/a11y
 */

// Focus Management
export {
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  isElementFocusable,
  useFocusTrap,
  useFocusReturn,
  useFocusVisible,
  useRovingTabIndex,
  useFocusWithin,
  type UseFocusTrapOptions,
  type UseRovingTabIndexOptions,
} from './focus-management';

// Announcements
export {
  announce,
  announcePolite,
  announceAssertive,
  clearAnnouncements,
  useAnnouncer,
  useProgressAnnouncer,
  useLoadingAnnouncer,
  useNavigationAnnouncer,
  type Politeness,
  type AnnounceOptions,
  type UseAnnouncerOptions,
  type UseProgressAnnouncerOptions,
} from './announcements';

// Keyboard
export {
  KEY_CODES,
  parseKeyBinding,
  formatKeyBinding,
  matchesKeyBinding,
  useKeyBindings,
  useKeyboardShortcut,
  useEscapeKey,
  useArrowKeys,
  useRegisterShortcut,
  useShortcutsList,
  shortcutsRegistry,
  type ModifierKey,
  type KeyboardModifiers,
  type KeyBinding,
  type KeyboardShortcut,
  type UseKeyBindingsOptions,
  type UseArrowKeysOptions,
} from './keyboard';

// Keyboard Navigation (extended)
export {
  registerShortcut,
  useShortcuts,
  useRovingTabindex,
  useArrowNavigation,
  moveFocus,
  focusFirstFocusable,
  globalShortcutRegistry,
  type NavigationDirection,
  type Orientation,
  type GridPosition,
  type ShortcutRegistration,
  type UseRovingTabindexOptions,
  type UseArrowNavigationOptions,
} from './keyboard-navigation';

// Reduced Motion
export {
  useReducedMotion,
  ReducedMotionProvider,
  useReducedMotionContext,
  withReducedMotion,
  getMotionSafeDuration,
  getMotionSafeTransition,
  useMotionSafeAnimation,
  getMotionSafeVariants,
  getMotionSafeTransitionConfig,
  useMotionSafeVariants,
  type ReducedMotionContextValue,
  type ReducedMotionProviderProps,
  type WithReducedMotionProps,
  type MotionSafeAnimationConfig,
  type MotionSafeVariants,
} from './reduced-motion';
