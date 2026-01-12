/**
 * Utils Tests
 *
 * Test suite for utility functions.
 *
 * @module lib/__tests__/utils.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  isDefined,
  isNonEmptyString,
  isNonEmptyArray,
  capitalize,
  kebabCase,
  truncate,
  clamp,
  formatNumber,
  formatPercent,
  unique,
  groupBy,
  chunk,
  deepClone,
  pick,
  omit,
  sleep,
  debounce,
  throttle,
  generateId,
  formatRelativeTime,
} from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge Tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('isDefined', () => {
  it('should return true for defined values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined([])).toBe(true);
  });

  it('should return false for null or undefined', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('should return false for empty strings', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});

describe('isNonEmptyArray', () => {
  it('should return true for non-empty arrays', () => {
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
  });

  it('should return false for empty arrays', () => {
    expect(isNonEmptyArray([])).toBe(false);
  });

  it('should return false for non-arrays', () => {
    expect(isNonEmptyArray('string')).toBe(false);
    expect(isNonEmptyArray(null)).toBe(false);
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle empty strings', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('kebabCase', () => {
  it('should convert to kebab-case', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
    expect(kebabCase('hello world')).toBe('hello-world');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('hello world', 5)).toBe('he...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('hi', 5)).toBe('hi');
  });
});

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('formatNumber', () => {
  it('should format numbers with decimals', () => {
    expect(formatNumber(1234.567, { decimals: 2 })).toContain('1,234.57');
  });

  it('should format without thousands separator', () => {
    expect(formatNumber(1234.567, { decimals: 2, thousandsSeparator: false })).toBe('1234.57');
  });
});

describe('formatPercent', () => {
  it('should format as percentage', () => {
    expect(formatPercent(0.1234, 1)).toBe('12.3%');
  });
});

describe('unique', () => {
  it('should remove duplicates', () => {
    expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('groupBy', () => {
  it('should group array by key', () => {
    const items = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 },
    ];
    const result = groupBy(items, (item) => item.type);
    expect(result.a).toHaveLength(2);
    expect(result.b).toHaveLength(1);
  });
});

describe('chunk', () => {
  it('should chunk array into smaller arrays', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('deepClone', () => {
  it('should deep clone objects', () => {
    const obj = { a: { b: 1 } };
    const cloned = deepClone(obj);
    cloned.a.b = 2;
    expect(obj.a.b).toBe(1);
  });
});

describe('pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 });
  });
});

describe('omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});

describe('sleep', () => {
  it('should sleep for specified time', async () => {
    const start = Date.now();
    await sleep(10);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(10);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle function calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should include prefix', () => {
    const id = generateId('test');
    expect(id).toContain('test');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format relative time', () => {
    const oneHourAgo = new Date('2024-01-01T11:00:00Z');
    expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
  });

  it('should handle just now', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('should handle plural units', () => {
    const twoMinutesAgo = new Date('2024-01-01T11:58:00Z');
    expect(formatRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');

    const threeHoursAgo = new Date('2024-01-01T09:00:00Z');
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');

    const fourDaysAgo = new Date('2023-12-28T12:00:00Z');
    expect(formatRelativeTime(fourDaysAgo)).toBe('4 days ago');
  });

  it('should accept timestamp number input', () => {
    const now = new Date('2024-01-01T12:00:00Z').getTime();
    const oneMinuteAgo = now - 60_000;
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
  });
});
