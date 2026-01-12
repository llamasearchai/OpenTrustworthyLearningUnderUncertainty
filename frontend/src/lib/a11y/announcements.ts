/**
 * Live Region Announcements
 *
 * Utilities for announcing content to screen readers using ARIA live regions.
 *
 * @module lib/a11y/announcements
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type Politeness = 'polite' | 'assertive' | 'off';

export interface AnnounceOptions {
  politeness?: Politeness;
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  clearAfter?: number;
}

// ============================================================================
// Live Region Manager
// ============================================================================

class LiveRegionManager {
  private regions: Map<Politeness, HTMLElement> = new Map();
  private timeouts: Map<Politeness, NodeJS.Timeout> = new Map();

  constructor() {
    if (typeof document !== 'undefined') {
      this.createRegion('polite');
      this.createRegion('assertive');
    }
  }

  private createRegion(politeness: Politeness): void {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';

    // Visually hidden but accessible to screen readers
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });

    document.body.appendChild(region);
    this.regions.set(politeness, region);
  }

  announce(message: string, options: AnnounceOptions = {}): void {
    const { politeness = 'polite', atomic = true, relevant = 'additions', clearAfter = 5000 } = options;

    if (politeness === 'off') return;

    const region = this.regions.get(politeness);
    if (!region) return;

    // Clear any existing timeout
    const existingTimeout = this.timeouts.get(politeness);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update attributes
    region.setAttribute('aria-atomic', String(atomic));
    region.setAttribute('aria-relevant', relevant);

    // Clear and set new content (forces re-announcement)
    region.textContent = '';

    // Use requestAnimationFrame to ensure the clear takes effect
    requestAnimationFrame(() => {
      region.textContent = message;
    });

    // Auto-clear after delay
    if (clearAfter > 0) {
      const timeout = setTimeout(() => {
        region.textContent = '';
      }, clearAfter);
      this.timeouts.set(politeness, timeout);
    }
  }

  clear(politeness?: Politeness): void {
    if (politeness) {
      const region = this.regions.get(politeness);
      if (region) {
        region.textContent = '';
      }
    } else {
      this.regions.forEach((region) => {
        region.textContent = '';
      });
    }
  }

  destroy(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.regions.forEach((region) => region.remove());
    this.regions.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let liveRegionManager: LiveRegionManager | null = null;

function getManager(): LiveRegionManager {
  if (!liveRegionManager && typeof document !== 'undefined') {
    liveRegionManager = new LiveRegionManager();
  }
  return liveRegionManager!;
}

// ============================================================================
// Public API
// ============================================================================

export function announce(message: string, options?: AnnounceOptions): void {
  getManager().announce(message, options);
}

export function announcePolite(message: string, options?: Omit<AnnounceOptions, 'politeness'>): void {
  announce(message, { ...options, politeness: 'polite' });
}

export function announceAssertive(message: string, options?: Omit<AnnounceOptions, 'politeness'>): void {
  announce(message, { ...options, politeness: 'assertive' });
}

export function clearAnnouncements(politeness?: Politeness): void {
  getManager().clear(politeness);
}

// ============================================================================
// React Hooks
// ============================================================================

export interface UseAnnouncerOptions extends AnnounceOptions {
  announceOnMount?: string;
  announceOnUnmount?: string;
}

export function useAnnouncer(options: UseAnnouncerOptions = {}) {
  const { announceOnMount, announceOnUnmount, ...announceOptions } = options;

  useEffect(() => {
    if (announceOnMount) {
      announce(announceOnMount, announceOptions);
    }

    return () => {
      if (announceOnUnmount) {
        announce(announceOnUnmount, announceOptions);
      }
    };
  }, [announceOnMount, announceOnUnmount]); // eslint-disable-line react-hooks/exhaustive-deps

  const announceMessage = useCallback(
    (message: string, overrideOptions?: AnnounceOptions) => {
      announce(message, { ...announceOptions, ...overrideOptions });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { announce: announceMessage, clear: clearAnnouncements };
}

export interface UseProgressAnnouncerOptions {
  interval?: number;
  politeness?: Politeness;
}

export function useProgressAnnouncer(options: UseProgressAnnouncerOptions = {}) {
  const { interval = 10000, politeness = 'polite' } = options;
  const lastAnnouncedRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const announceProgress = useCallback(
    (progress: number, message?: string) => {
      progressRef.current = progress;

      const now = Date.now();
      const timeSinceLastAnnounce = now - lastAnnouncedRef.current;

      // Announce immediately for 0, 100, or if interval has passed
      if (progress === 0 || progress === 100 || timeSinceLastAnnounce >= interval) {
        const text = message ?? `Progress: ${Math.round(progress)}%`;
        announce(text, { politeness });
        lastAnnouncedRef.current = now;
      }
    },
    [interval, politeness]
  );

  const announceComplete = useCallback(
    (message: string = 'Operation complete') => {
      announce(message, { politeness: 'assertive' });
    },
    []
  );

  const announceError = useCallback((message: string) => {
    announce(message, { politeness: 'assertive' });
  }, []);

  return { announceProgress, announceComplete, announceError };
}

export function useLoadingAnnouncer() {
  const isLoadingRef = useRef(false);

  const announceLoading = useCallback((isLoading: boolean, context?: string) => {
    if (isLoading && !isLoadingRef.current) {
      isLoadingRef.current = true;
      const message = context ? `Loading ${context}...` : 'Loading...';
      announcePolite(message);
    } else if (!isLoading && isLoadingRef.current) {
      isLoadingRef.current = false;
      const message = context ? `${context} loaded` : 'Content loaded';
      announcePolite(message);
    }
  }, []);

  return { announceLoading };
}

export function useNavigationAnnouncer() {
  const announceNavigation = useCallback((destination: string) => {
    announcePolite(`Navigated to ${destination}`);
  }, []);

  const announcePageChange = useCallback((pageTitle: string) => {
    announcePolite(pageTitle, { clearAfter: 3000 });
  }, []);

  return { announceNavigation, announcePageChange };
}
