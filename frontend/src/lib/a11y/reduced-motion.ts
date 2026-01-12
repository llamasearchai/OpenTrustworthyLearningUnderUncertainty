/**
 * Reduced Motion Utilities
 *
 * Hooks and components for respecting user motion preferences.
 *
 * @module lib/a11y/reduced-motion
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  ComponentType,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ReducedMotionContextValue {
  prefersReducedMotion: boolean;
  isReduced: boolean;
  setOverride: (value: boolean | null) => void;
}

export interface ReducedMotionProviderProps {
  children: ReactNode;
  defaultOverride?: boolean | null;
}

export interface WithReducedMotionProps {
  prefersReducedMotion: boolean;
}

// ============================================================================
// Media Query Utility
// ============================================================================

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return null;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

function getInitialPrefersReducedMotion(): boolean {
  const mediaQuery = getMediaQuery();
  return mediaQuery?.matches ?? false;
}

// ============================================================================
// useReducedMotion Hook
// ============================================================================

/**
 * Hook to detect if the user prefers reduced motion
 *
 * @returns true if the user has enabled reduced motion in their OS settings
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={{ x: 100 }}
 *       transition={{
 *         duration: prefersReducedMotion ? 0 : 0.3,
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    getInitialPrefersReducedMotion
  );

  useEffect(() => {
    const mediaQuery = getMediaQuery();
    if (!mediaQuery) return;

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// Reduced Motion Context
// ============================================================================

const ReducedMotionContext = createContext<ReducedMotionContextValue | null>(null);

/**
 * Provider for reduced motion preferences with override capability
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ReducedMotionProvider>
 *       <YourApp />
 *     </ReducedMotionProvider>
 *   );
 * }
 * ```
 */
export function ReducedMotionProvider({
  children,
  defaultOverride = null,
}: ReducedMotionProviderProps) {
  const systemPreference = useReducedMotion();
  const [override, setOverride] = useState<boolean | null>(defaultOverride);

  const value = useMemo<ReducedMotionContextValue>(
    () => ({
      prefersReducedMotion: systemPreference,
      isReduced: override ?? systemPreference,
      setOverride,
    }),
    [systemPreference, override]
  );

  return React.createElement(
    ReducedMotionContext.Provider,
    { value },
    children
  );
}

/**
 * Hook to access reduced motion context with override support
 *
 * @returns Context value with system preference, effective state, and override setter
 *
 * @example
 * ```tsx
 * function AnimationSettings() {
 *   const { isReduced, setOverride } = useReducedMotionContext();
 *
 *   return (
 *     <Switch
 *       checked={isReduced}
 *       onCheckedChange={(checked) => setOverride(checked)}
 *       label="Reduce motion"
 *     />
 *   );
 * }
 * ```
 */
export function useReducedMotionContext(): ReducedMotionContextValue {
  const context = useContext(ReducedMotionContext);

  if (!context) {
    // Return a fallback that uses the hook directly
    const systemPreference = useReducedMotion();
    return {
      prefersReducedMotion: systemPreference,
      isReduced: systemPreference,
      setOverride: () => {
        console.warn(
          'useReducedMotionContext: setOverride called outside of ReducedMotionProvider'
        );
      },
    };
  }

  return context;
}

// ============================================================================
// withReducedMotion HOC
// ============================================================================

/**
 * Higher-Order Component that injects reduced motion preference as a prop
 *
 * @param Component - Component to wrap
 * @returns Wrapped component with prefersReducedMotion prop
 *
 * @example
 * ```tsx
 * interface MyComponentProps extends WithReducedMotionProps {
 *   title: string;
 * }
 *
 * function MyComponent({ title, prefersReducedMotion }: MyComponentProps) {
 *   return (
 *     <div style={{ transition: prefersReducedMotion ? 'none' : 'all 0.3s' }}>
 *       {title}
 *     </div>
 *   );
 * }
 *
 * export default withReducedMotion(MyComponent);
 * ```
 */
export function withReducedMotion<P extends WithReducedMotionProps>(
  Component: ComponentType<P>
): ComponentType<Omit<P, 'prefersReducedMotion'>> {
  function WrappedComponent(props: Omit<P, 'prefersReducedMotion'>) {
    const prefersReducedMotion = useReducedMotion();

    return React.createElement(Component, {
      ...props,
      prefersReducedMotion,
    } as P);
  }

  WrappedComponent.displayName = `withReducedMotion(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}

// ============================================================================
// Motion-Safe Animation Utilities
// ============================================================================

export interface MotionSafeAnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
}

/**
 * Get animation duration respecting reduced motion preference
 */
export function getMotionSafeDuration(
  duration: number,
  prefersReducedMotion: boolean
): number {
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Get motion-safe CSS transition string
 */
export function getMotionSafeTransition(
  properties: string[],
  config: MotionSafeAnimationConfig,
  prefersReducedMotion: boolean
): string {
  if (prefersReducedMotion) {
    return 'none';
  }

  const { duration, delay = 0, easing = 'ease' } = config;

  return properties
    .map((prop) => `${prop} ${duration}ms ${easing} ${delay}ms`)
    .join(', ');
}

/**
 * Hook for motion-safe animation values
 */
export function useMotionSafeAnimation(config: MotionSafeAnimationConfig) {
  const prefersReducedMotion = useReducedMotion();

  const duration = getMotionSafeDuration(config.duration, prefersReducedMotion);

  const getTransition = useCallback(
    (properties: string[]) =>
      getMotionSafeTransition(properties, config, prefersReducedMotion),
    [config, prefersReducedMotion]
  );

  return {
    prefersReducedMotion,
    duration,
    getTransition,
  };
}

// ============================================================================
// Framer Motion Integration
// ============================================================================

export interface MotionSafeVariants {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit?: Record<string, unknown>;
}

/**
 * Get motion-safe variants for Framer Motion
 */
export function getMotionSafeVariants(
  variants: MotionSafeVariants,
  prefersReducedMotion: boolean
): MotionSafeVariants {
  if (prefersReducedMotion) {
    // Return static variants (no animation)
    return {
      initial: variants.animate,
      animate: variants.animate,
      exit: variants.exit ? variants.animate : undefined,
    };
  }

  return variants;
}

/**
 * Get motion-safe transition config for Framer Motion
 */
export function getMotionSafeTransitionConfig(
  transition: Record<string, unknown>,
  prefersReducedMotion: boolean
): Record<string, unknown> {
  if (prefersReducedMotion) {
    return {
      ...transition,
      duration: 0,
      delay: 0,
    };
  }

  return transition;
}

/**
 * Hook for Framer Motion integration
 */
export function useMotionSafeVariants(variants: MotionSafeVariants) {
  const prefersReducedMotion = useReducedMotion();

  return useMemo(
    () => getMotionSafeVariants(variants, prefersReducedMotion),
    [variants, prefersReducedMotion]
  );
}
