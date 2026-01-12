/**
 * i18n Configuration
 *
 * Configuration and utilities for internationalization using react-i18next.
 *
 * @module lib/i18n/config
 */

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export type Namespace =
  | 'common'
  | 'errors'
  | 'validation'
  | 'navigation'
  | 'dashboard'
  | 'uncertainty'
  | 'safety'
  | 'evaluation'
  | 'settings';

export interface I18nConfig {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  defaultNamespace: Namespace;
  fallbackLocale: SupportedLocale;
  debug: boolean;
  interpolation: {
    escapeValue: boolean;
    formatSeparator: string;
  };
  detection: {
    order: string[];
    lookupLocalStorage: string;
    lookupCookie: string;
    caches: string[];
  };
}

export interface TranslationResource {
  [key: string]: string | TranslationResource;
}

export interface NamespaceResources {
  [namespace: string]: TranslationResource;
}

export interface LocaleResources {
  [locale: string]: NamespaceResources;
}

// ============================================================================
// Configuration
// ============================================================================

export const i18nConfig: I18nConfig = {
  defaultLocale: 'en',
  supportedLocales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
  defaultNamespace: 'common',
  fallbackLocale: 'en',
  debug: import.meta.env.DEV,
  interpolation: {
    escapeValue: false, // React already escapes values
    formatSeparator: ',',
  },
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'i18nextLng',
    lookupCookie: 'i18next',
    caches: ['localStorage'],
  },
};

// ============================================================================
// Locale Metadata
// ============================================================================

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

export const localeMetadata: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Espanol',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Francais',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: ' ' },
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '\u65E5\u672C\u8A9E',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '\u4E2D\u6587',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: { decimal: '.', thousands: ',' },
  },
};

// ============================================================================
// Namespace Loading
// ============================================================================

const loadedNamespaces: Set<string> = new Set();
const loadingNamespaces: Map<string, Promise<TranslationResource>> = new Map();

/**
 * Load a translation namespace dynamically
 *
 * @example
 * ```tsx
 * await loadNamespace('en', 'dashboard');
 * ```
 */
export async function loadNamespace(
  locale: SupportedLocale,
  namespace: Namespace
): Promise<TranslationResource> {
  const key = `${locale}:${namespace}`;

  // Return if already loaded
  if (loadedNamespaces.has(key)) {
    return {};
  }

  // Return existing promise if currently loading
  const existingPromise = loadingNamespaces.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  // Create loading promise
  const loadPromise = (async () => {
    try {
      // Dynamic import of translation files
      const module = await import(`./locales/${locale}/${namespace}.json`);
      loadedNamespaces.add(key);
      return module.default as TranslationResource;
    } catch (error) {
      console.warn(`Failed to load namespace "${namespace}" for locale "${locale}":`, error);
      // Try fallback locale
      if (locale !== i18nConfig.fallbackLocale) {
        return loadNamespace(i18nConfig.fallbackLocale, namespace);
      }
      return {};
    } finally {
      loadingNamespaces.delete(key);
    }
  })();

  loadingNamespaces.set(key, loadPromise);
  return loadPromise;
}

/**
 * Preload multiple namespaces
 */
export async function preloadNamespaces(
  locale: SupportedLocale,
  namespaces: Namespace[]
): Promise<void> {
  await Promise.all(namespaces.map((ns) => loadNamespace(locale, ns)));
}

/**
 * Check if a namespace is loaded
 */
export function isNamespaceLoaded(locale: SupportedLocale, namespace: Namespace): boolean {
  return loadedNamespaces.has(`${locale}:${namespace}`);
}

// ============================================================================
// useNamespace Hook
// ============================================================================

export interface UseNamespaceResult {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
}

/**
 * Hook to load and manage a translation namespace
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const { isLoading, isLoaded } = useNamespace('dashboard');
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useNamespace(
  namespace: Namespace | Namespace[],
  locale?: SupportedLocale
): UseNamespaceResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const currentLocale = locale ?? i18nConfig.defaultLocale;
  const namespaces = Array.isArray(namespace) ? namespace : [namespace];

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Check if all namespaces are already loaded
      const allLoaded = namespaces.every((ns) => isNamespaceLoaded(currentLocale, ns));
      if (allLoaded) {
        setIsLoaded(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await preloadNamespaces(currentLocale, namespaces);
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentLocale, namespaces.join(',')]);

  return { isLoading, isLoaded, error };
}

// ============================================================================
// Locale Utilities
// ============================================================================

/**
 * Get the user's preferred locale
 */
export function getPreferredLocale(): SupportedLocale {
  // Check localStorage
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(i18nConfig.detection.lookupLocalStorage);
    if (stored && i18nConfig.supportedLocales.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  }

  // Check navigator language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0] as SupportedLocale;
    if (i18nConfig.supportedLocales.includes(browserLang)) {
      return browserLang;
    }
  }

  return i18nConfig.defaultLocale;
}

/**
 * Set the current locale
 */
export function setLocale(locale: SupportedLocale): void {
  if (!i18nConfig.supportedLocales.includes(locale)) {
    console.warn(`Locale "${locale}" is not supported`);
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(i18nConfig.detection.lookupLocalStorage, locale);
  }

  // Update document direction
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeMetadata[locale].direction;
  }
}

/**
 * Get locale metadata
 */
export function getLocaleMetadata(locale: SupportedLocale): LocaleMetadata {
  return localeMetadata[locale] ?? localeMetadata[i18nConfig.defaultLocale];
}

// ============================================================================
// useLocale Hook
// ============================================================================

export interface UseLocaleResult {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  metadata: LocaleMetadata;
  supportedLocales: SupportedLocale[];
}

/**
 * Hook for managing locale state
 */
export function useLocale(): UseLocaleResult {
  const [locale, setLocaleState] = useState<SupportedLocale>(getPreferredLocale);

  const handleSetLocale = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const metadata = getLocaleMetadata(locale);

  return {
    locale,
    setLocale: handleSetLocale,
    metadata,
    supportedLocales: i18nConfig.supportedLocales,
  };
}

// ============================================================================
// Translation Key Type Safety
// ============================================================================

/**
 * Type helper for translation keys
 * Use this to create type-safe translation key helpers
 */
export type TranslationKey<T extends string = string> = T;

/**
 * Create a namespaced translation key
 */
export function createTranslationKey<NS extends Namespace>(
  namespace: NS,
  key: string
): string {
  return `${namespace}:${key}`;
}

// ============================================================================
// Pluralization Rules
// ============================================================================

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function getPluralCategory(count: number, locale: SupportedLocale): PluralCategory {
  const pluralRules = new Intl.PluralRules(locale);
  return pluralRules.select(count) as PluralCategory;
}

// ============================================================================
// Export Default Config
// ============================================================================

export default i18nConfig;
