/**
 * Lazy Loading Utilities
 *
 * Utilities for lazy loading components with preloading support.
 *
 * @module lib/performance/lazy
 */

import React, {
  lazy,
  Suspense,
  ComponentType,
  LazyExoticComponent,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  ForwardRefExoticComponent,
  RefAttributes,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type LazyComponentImport<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

export interface PreloadableComponent<T extends ComponentType<unknown>>
  extends LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>;
}

export interface LazyWithPreloadOptions {
  fallback?: ReactNode;
  delay?: number;
  minimumLoadTime?: number;
}

// ============================================================================
// lazyWithPreload Function
// ============================================================================

/**
 * Create a lazy component with preload capability
 *
 * @example
 * ```tsx
 * // Define the lazy component
 * const LazyChart = lazyWithPreload(
 *   () => import('./Chart'),
 *   { fallback: <ChartSkeleton /> }
 * );
 *
 * // Preload when needed
 * LazyChart.preload();
 *
 * // Use in component
 * function Dashboard() {
 *   return (
 *     <Suspense fallback={<ChartSkeleton />}>
 *       <LazyChart data={data} />
 *     </Suspense>
 *   );
 * }
 * ```
 */
export function lazyWithPreload<T extends ComponentType<unknown>>(
  importFn: LazyComponentImport<T>,
  options: LazyWithPreloadOptions = {}
): PreloadableComponent<T> {
  const { delay = 0, minimumLoadTime = 0 } = options;

  let importPromise: Promise<{ default: T }> | null = null;
  let Component: T | null = null;
  let loadStartTime = 0;

  const load = async (): Promise<{ default: T }> => {
    if (importPromise) {
      return importPromise;
    }

    loadStartTime = Date.now();

    importPromise = (async () => {
      // Optional delay before starting to load
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const module = await importFn();
      Component = module.default;

      // Ensure minimum load time (useful for skeleton animations)
      const elapsed = Date.now() - loadStartTime;
      if (minimumLoadTime > 0 && elapsed < minimumLoadTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumLoadTime - elapsed)
        );
      }

      return module;
    })();

    return importPromise;
  };

  const LazyComponent = lazy(load) as PreloadableComponent<T>;

  LazyComponent.preload = load;

  return LazyComponent;
}

// ============================================================================
// preloadOnHover HOC
// ============================================================================

export interface PreloadOnHoverOptions {
  delay?: number;
}

/**
 * HOC that preloads a lazy component when hovering over the trigger element
 *
 * @example
 * ```tsx
 * const LazyModal = lazyWithPreload(() => import('./Modal'));
 *
 * const SettingsButton = preloadOnHover(
 *   function Button(props) {
 *     return <button {...props}>Settings</button>;
 *   },
 *   LazyModal
 * );
 *
 * // Hovering over the button will preload the Modal component
 * function App() {
 *   const [showModal, setShowModal] = useState(false);
 *
 *   return (
 *     <>
 *       <SettingsButton onClick={() => setShowModal(true)} />
 *       {showModal && (
 *         <Suspense fallback={<Spinner />}>
 *           <LazyModal onClose={() => setShowModal(false)} />
 *         </Suspense>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function preloadOnHover<
  TriggerProps extends { onMouseEnter?: React.MouseEventHandler },
  LazyProps extends object
>(
  TriggerComponent: ComponentType<TriggerProps>,
  lazyComponent: any,
  options: PreloadOnHoverOptions = {}
): ComponentType<TriggerProps> {
  const { delay = 100 } = options;

  function PreloadOnHoverWrapper(props: TriggerProps) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const hasPreloaded = useRef(false);

    const handleMouseEnter = useCallback(
      (event: React.MouseEvent) => {
        props.onMouseEnter?.(event);

        if (hasPreloaded.current) return;

        timeoutRef.current = setTimeout(() => {
          lazyComponent.preload();
          hasPreloaded.current = true;
        }, delay);
      },
      [props.onMouseEnter]
    );

    const handleMouseLeave = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return React.createElement(TriggerComponent, {
      ...props,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    } as TriggerProps);
  }

  PreloadOnHoverWrapper.displayName = `preloadOnHover(${
    TriggerComponent.displayName || TriggerComponent.name || 'Component'
  })`;

  return PreloadOnHoverWrapper;
}

// ============================================================================
// preloadOnVisible HOC
// ============================================================================

export interface PreloadOnVisibleOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * HOC that preloads a lazy component when the trigger element becomes visible
 *
 * @example
 * ```tsx
 * const LazyChart = lazyWithPreload(() => import('./Chart'));
 *
 * const ChartSection = preloadOnVisible(
 *   function Section({ children }) {
 *     return <section>{children}</section>;
 *   },
 *   LazyChart,
 *   { threshold: 0.5, rootMargin: '100px' }
 * );
 *
 * // Chart component will be preloaded when section is 50% visible
 * function Dashboard() {
 *   return (
 *     <ChartSection>
 *       <h2>Analytics</h2>
 *       <Suspense fallback={<ChartSkeleton />}>
 *         <LazyChart />
 *       </Suspense>
 *     </ChartSection>
 *   );
 * }
 * ```
 */
export function preloadOnVisible<
  TriggerProps extends object,
  LazyProps extends object
>(
  TriggerComponent: ComponentType<TriggerProps>,
  lazyComponent: any,
  options: PreloadOnVisibleOptions = {}
): ForwardRefExoticComponent<TriggerProps & RefAttributes<HTMLElement>> {
  const { threshold = 0.1, rootMargin = '50px', triggerOnce = true } = options;

  const PreloadOnVisibleWrapper = forwardRef<HTMLElement, TriggerProps>(
    function PreloadOnVisibleWrapper(props, ref) {
      const elementRef = useRef<HTMLElement>(null);
      const hasPreloaded = useRef(false);

      useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && !hasPreloaded.current) {
              lazyComponent.preload();
              hasPreloaded.current = true;

              if (triggerOnce) {
                observer.disconnect();
              }
            }
          },
          { threshold, rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
      }, []);

      // Combine refs
      const combinedRef = useCallback(
        (node: HTMLElement | null) => {
          (elementRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLElement | null>).current = node;
          }
        },
        [ref]
      );

      return React.createElement(
        'div',
        { ref: combinedRef },
        (React.createElement as any)(TriggerComponent, props)
      );
    }
  );

  PreloadOnVisibleWrapper.displayName = `preloadOnVisible(${
    TriggerComponent.displayName || TriggerComponent.name || 'Component'
  })`;

  return PreloadOnVisibleWrapper as any;
}

// ============================================================================
// Preload on Idle
// ============================================================================

/**
 * Preload components during browser idle time
 *
 * @example
 * ```tsx
 * const LazySettings = lazyWithPreload(() => import('./Settings'));
 * const LazyProfile = lazyWithPreload(() => import('./Profile'));
 *
 * // Preload these components when the browser is idle
 * preloadOnIdle([LazySettings, LazyProfile]);
 * ```
 */
export function preloadOnIdle(
  components: PreloadableComponent<ComponentType<unknown>>[],
  options: { timeout?: number } = {}
): void {
  const { timeout = 2000 } = options;

  if (typeof window === 'undefined') return;

  const preload = () => {
    components.forEach((component) => {
      component.preload();
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preload, { timeout });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(preload, 1);
  }
}

// ============================================================================
// Preload on Route Change
// ============================================================================

export interface RoutePreloadConfig {
  path: string | RegExp;
  preload: () => void;
}

/**
 * Create a route-based preloader
 *
 * @example
 * ```tsx
 * const routePreloader = createRoutePreloader([
 *   { path: '/dashboard', preload: () => LazyDashboard.preload() },
 *   { path: /^\/user\//, preload: () => LazyUserProfile.preload() },
 * ]);
 *
 * // Use in a link component
 * function NavLink({ to, children }) {
 *   return (
 *     <Link
 *       to={to}
 *       onMouseEnter={() => routePreloader.preloadForPath(to)}
 *     >
 *       {children}
 *     </Link>
 *   );
 * }
 * ```
 */
export function createRoutePreloader(configs: RoutePreloadConfig[]) {
  const preloadedPaths = new Set<string>();

  return {
    preloadForPath: (path: string) => {
      if (preloadedPaths.has(path)) return;

      for (const config of configs) {
        const matches =
          typeof config.path === 'string'
            ? path === config.path || path.startsWith(config.path + '/')
            : config.path.test(path);

        if (matches) {
          config.preload();
          preloadedPaths.add(path);
          break;
        }
      }
    },
    clearCache: () => {
      preloadedPaths.clear();
    },
  };
}

// ============================================================================
// Suspense with Delay
// ============================================================================

export interface SuspenseWithDelayProps {
  children: ReactNode;
  fallback: ReactNode;
  delay?: number;
}

/**
 * Suspense wrapper that only shows fallback after a delay
 * Prevents flash of loading state for fast loads
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SuspenseWithDelay
 *       fallback={<Spinner />}
 *       delay={300}
 *     >
 *       <LazyComponent />
 *     </SuspenseWithDelay>
 *   );
 * }
 * ```
 */
export function SuspenseWithDelay({
  children,
  fallback,
  delay = 200,
}: SuspenseWithDelayProps) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  return React.createElement(
    Suspense,
    { fallback: showFallback ? fallback : null },
    children
  );
}

// ============================================================================
// Preload Utility for Dynamic Imports
// ============================================================================

/**
 * Preload a dynamic import
 *
 * @example
 * ```tsx
 * // Preload data module
 * preloadImport(() => import('./data/analytics'));
 *
 * // Later use
 * const { processAnalytics } = await import('./data/analytics');
 * ```
 */
export function preloadImport<T>(importFn: () => Promise<T>): Promise<T> {
  return importFn();
}

/**
 * Create a preloadable import with caching
 */
export function createPreloadableImport<T>(importFn: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  let result: T | null = null;

  return {
    preload: () => {
      if (!promise) {
        promise = importFn().then((module) => {
          result = module;
          return module;
        });
      }
      return promise;
    },
    get: async () => {
      if (result) return result;
      if (promise) return promise;
      return (promise = importFn().then((module) => {
        result = module;
        return module;
      }));
    },
    isLoaded: () => result !== null,
  };
}
