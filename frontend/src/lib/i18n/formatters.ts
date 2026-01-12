/**
 * i18n Formatters
 *
 * Locale-aware formatting utilities for numbers, dates, and text.
 *
 * @module lib/i18n/formatters
 */

import { getPreferredLocale, type SupportedLocale } from './config';

// ============================================================================
// Number Formatting
// ============================================================================

export interface FormatNumberOptions {
  locale?: SupportedLocale;
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  unit?: string;
  unitDisplay?: 'short' | 'long' | 'narrow';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumIntegerDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
  useGrouping?: boolean;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/**
 * Format a number according to locale
 *
 * @example
 * ```tsx
 * formatNumber(1234567.89); // "1,234,567.89" (en)
 * formatNumber(1234567.89, { locale: 'de' }); // "1.234.567,89"
 * formatNumber(0.75, { style: 'percent' }); // "75%"
 * formatNumber(1234, { notation: 'compact' }); // "1.2K"
 * ```
 */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const locale = options.locale ?? getPreferredLocale();

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: options.style ?? 'decimal',
      currency: options.currency,
      unit: options.unit,
      unitDisplay: options.unitDisplay,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      minimumIntegerDigits: options.minimumIntegerDigits,
      minimumSignificantDigits: options.minimumSignificantDigits,
      maximumSignificantDigits: options.maximumSignificantDigits,
      useGrouping: options.useGrouping,
      notation: options.notation,
      compactDisplay: options.compactDisplay,
      signDisplay: options.signDisplay,
    });

    return formatter.format(value);
  } catch (error) {
    console.warn('Number formatting error:', error);
    return String(value);
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale?: SupportedLocale
): string {
  return formatNumber(value, {
    locale,
    style: 'currency',
    currency,
  });
}

/**
 * Format a number as percentage
 */
export function formatPercent(
  value: number,
  options: Pick<FormatNumberOptions, 'locale' | 'minimumFractionDigits' | 'maximumFractionDigits'> = {}
): string {
  return formatNumber(value, {
    ...options,
    style: 'percent',
  });
}

/**
 * Format a number in compact notation
 */
export function formatCompact(
  value: number,
  options: Pick<FormatNumberOptions, 'locale' | 'compactDisplay'> = {}
): string {
  return formatNumber(value, {
    ...options,
    notation: 'compact',
    compactDisplay: options.compactDisplay ?? 'short',
  });
}

// ============================================================================
// Date Formatting
// ============================================================================

export interface FormatDateOptions {
  locale?: SupportedLocale;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  weekday?: 'long' | 'short' | 'narrow';
  era?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'long' | 'short' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric';
  timeZone?: string;
  hour12?: boolean;
}

/**
 * Format a date according to locale
 *
 * @example
 * ```tsx
 * formatDate(new Date()); // "1/2/2026" (en, short)
 * formatDate(new Date(), { dateStyle: 'full' }); // "Friday, January 2, 2026"
 * formatDate(new Date(), { dateStyle: 'long', timeStyle: 'short' }); // "January 2, 2026 at 3:30 PM"
 * ```
 */
export function formatDate(
  date: Date | number | string,
  options: FormatDateOptions = {}
): string {
  const locale = options.locale ?? getPreferredLocale();
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDate');
    return String(date);
  }

  try {
    const { locale: _, ...formatOptions } = options;

    // If no style options provided, use short date style
    if (
      !formatOptions.dateStyle &&
      !formatOptions.timeStyle &&
      !formatOptions.year &&
      !formatOptions.month &&
      !formatOptions.day
    ) {
      formatOptions.dateStyle = 'short';
    }

    const formatter = new Intl.DateTimeFormat(locale, formatOptions);
    return formatter.format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | number | string,
  options: Omit<FormatDateOptions, 'dateStyle' | 'timeStyle'> & {
    dateStyle?: FormatDateOptions['dateStyle'];
    timeStyle?: FormatDateOptions['timeStyle'];
  } = {}
): string {
  return formatDate(date, {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
    ...options,
  });
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | number | string,
  options: Pick<FormatDateOptions, 'locale' | 'timeStyle' | 'hour' | 'minute' | 'second' | 'hour12'> = {}
): string {
  return formatDate(date, {
    ...options,
    timeStyle: options.timeStyle ?? 'short',
  });
}

// ============================================================================
// Relative Time Formatting
// ============================================================================

export type RelativeTimeUnit =
  | 'year'
  | 'years'
  | 'quarter'
  | 'quarters'
  | 'month'
  | 'months'
  | 'week'
  | 'weeks'
  | 'day'
  | 'days'
  | 'hour'
  | 'hours'
  | 'minute'
  | 'minutes'
  | 'second'
  | 'seconds';

export interface FormatRelativeTimeOptions {
  locale?: SupportedLocale;
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
}

const RELATIVE_TIME_THRESHOLDS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
}> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 *
 * @example
 * ```tsx
 * formatRelativeTime(Date.now() - 3600000); // "1 hour ago"
 * formatRelativeTime(Date.now() + 86400000); // "in 1 day"
 * formatRelativeTime(-2, 'days'); // "2 days ago"
 * ```
 */
export function formatRelativeTime(
  value: Date | number,
  unitOrOptions?: RelativeTimeUnit | FormatRelativeTimeOptions,
  options?: FormatRelativeTimeOptions
): string {
  const locale = (typeof unitOrOptions === 'object' ? unitOrOptions.locale : options?.locale) ?? getPreferredLocale();
  const formatOptions = typeof unitOrOptions === 'object' ? unitOrOptions : options ?? {};

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, {
      style: formatOptions.style ?? 'long',
      numeric: formatOptions.numeric ?? 'auto',
    });

    // If a unit is explicitly provided
    if (typeof unitOrOptions === 'string' && typeof value === 'number') {
      const unit = unitOrOptions.replace(/s$/, '') as Intl.RelativeTimeFormatUnit;
      return formatter.format(value, unit);
    }

    // Calculate the difference from now
    const timestamp = value instanceof Date ? value.getTime() : value;
    const diff = timestamp - Date.now();
    const absDiff = Math.abs(diff);

    // Find the appropriate unit
    for (const threshold of RELATIVE_TIME_THRESHOLDS) {
      if (absDiff >= threshold.ms || threshold.unit === 'second') {
        const amount = Math.round(diff / threshold.ms);
        return formatter.format(amount, threshold.unit);
      }
    }

    return formatter.format(0, 'second');
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return String(value);
  }
}

/**
 * Get human-readable time ago string
 */
export function timeAgo(date: Date | number | string, locale?: SupportedLocale): string {
  const timestamp = date instanceof Date ? date : new Date(date);
  return formatRelativeTime(timestamp, { locale, numeric: 'auto' });
}

// ============================================================================
// List Formatting
// ============================================================================

export interface FormatListOptions {
  locale?: SupportedLocale;
  type?: 'conjunction' | 'disjunction' | 'unit';
  style?: 'long' | 'short' | 'narrow';
}

/**
 * Format a list of items according to locale
 *
 * @example
 * ```tsx
 * formatList(['Apple', 'Orange', 'Banana']); // "Apple, Orange, and Banana"
 * formatList(['Apple', 'Orange'], { type: 'disjunction' }); // "Apple or Orange"
 * formatList(['5 kg', '200 g'], { type: 'unit' }); // "5 kg, 200 g"
 * ```
 */
export function formatList(items: string[], options: FormatListOptions = {}): string {
  const locale = options.locale ?? getPreferredLocale();

  if (items.length === 0) return '';
  if (items.length === 1) return items[0];

  try {
    const formatter = new Intl.ListFormat(locale, {
      type: options.type ?? 'conjunction',
      style: options.style ?? 'long',
    });

    return formatter.format(items);
  } catch (error) {
    console.warn('List formatting error:', error);
    return items.join(', ');
  }
}

// ============================================================================
// Unit Formatting
// ============================================================================

export type UnitType =
  // Length
  | 'kilometer'
  | 'meter'
  | 'centimeter'
  | 'millimeter'
  | 'mile'
  | 'yard'
  | 'foot'
  | 'inch'
  // Mass
  | 'kilogram'
  | 'gram'
  | 'milligram'
  | 'pound'
  | 'ounce'
  // Volume
  | 'liter'
  | 'milliliter'
  | 'gallon'
  | 'fluid-ounce'
  // Temperature
  | 'celsius'
  | 'fahrenheit'
  | 'kelvin'
  // Time
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond'
  // Digital
  | 'byte'
  | 'kilobyte'
  | 'megabyte'
  | 'gigabyte'
  | 'terabyte'
  | 'petabyte'
  // Speed
  | 'kilometer-per-hour'
  | 'meter-per-second'
  | 'mile-per-hour'
  // Other
  | 'percent';

export interface FormatUnitOptions {
  locale?: SupportedLocale;
  unitDisplay?: 'short' | 'long' | 'narrow';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a value with a unit
 *
 * @example
 * ```tsx
 * formatUnit(5, 'kilometer'); // "5 km"
 * formatUnit(72, 'kilogram', { unitDisplay: 'long' }); // "72 kilograms"
 * formatUnit(37.5, 'celsius'); // "37.5\u00B0C"
 * ```
 */
export function formatUnit(
  value: number,
  unit: UnitType,
  options: FormatUnitOptions = {}
): string {
  const locale = options.locale ?? getPreferredLocale();

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: options.unitDisplay ?? 'short',
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    });

    return formatter.format(value);
  } catch (error) {
    console.warn('Unit formatting error:', error);
    return `${value} ${unit}`;
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, options: Omit<FormatUnitOptions, 'unit'> = {}): string {
  const units: UnitType[] = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return formatUnit(value, units[unitIndex], {
    ...options,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(
  ms: number,
  options: Pick<FormatUnitOptions, 'locale' | 'unitDisplay'> = {}
): string {
  const locale = options.locale ?? getPreferredLocale();

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(formatUnit(hours, 'hour', { locale, unitDisplay: options.unitDisplay }));
  }
  if (minutes > 0) {
    parts.push(formatUnit(minutes, 'minute', { locale, unitDisplay: options.unitDisplay }));
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(formatUnit(seconds, 'second', { locale, unitDisplay: options.unitDisplay }));
  }

  return formatList(parts, { locale, type: 'unit', style: 'narrow' });
}

// ============================================================================
// Display Names
// ============================================================================

export interface FormatDisplayNameOptions {
  locale?: SupportedLocale;
  type: 'language' | 'region' | 'script' | 'currency';
  style?: 'long' | 'short' | 'narrow';
  fallback?: 'code' | 'none';
}

/**
 * Format display names for languages, regions, etc.
 *
 * @example
 * ```tsx
 * formatDisplayName('en', { type: 'language' }); // "English"
 * formatDisplayName('US', { type: 'region' }); // "United States"
 * formatDisplayName('USD', { type: 'currency' }); // "US Dollar"
 * ```
 */
export function formatDisplayName(
  code: string,
  options: FormatDisplayNameOptions
): string {
  const locale = options.locale ?? getPreferredLocale();

  try {
    const formatter = new Intl.DisplayNames(locale, {
      type: options.type,
      style: options.style ?? 'long',
      fallback: options.fallback ?? 'code',
    });

    return formatter.of(code) ?? code;
  } catch (error) {
    console.warn('Display name formatting error:', error);
    return code;
  }
}
