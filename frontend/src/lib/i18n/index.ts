/**
 * i18n Module
 *
 * Exports all internationalization utilities and configuration.
 *
 * @module lib/i18n
 */

// Configuration
export {
  i18nConfig,
  localeMetadata,
  loadNamespace,
  preloadNamespaces,
  isNamespaceLoaded,
  useNamespace,
  getPreferredLocale,
  setLocale,
  getLocaleMetadata,
  useLocale,
  createTranslationKey,
  getPluralCategory,
  type SupportedLocale,
  type Namespace,
  type I18nConfig,
  type TranslationResource,
  type NamespaceResources,
  type LocaleResources,
  type LocaleMetadata,
  type UseNamespaceResult,
  type UseLocaleResult,
  type TranslationKey,
  type PluralCategory,
} from './config';

// Formatters
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  timeAgo,
  formatList,
  formatUnit,
  formatBytes,
  formatDuration,
  formatDisplayName,
  type FormatNumberOptions,
  type FormatDateOptions,
  type FormatRelativeTimeOptions,
  type RelativeTimeUnit,
  type FormatListOptions,
  type FormatUnitOptions,
  type UnitType,
  type FormatDisplayNameOptions,
} from './formatters';
