/**
 * DateRangePicker Component Tests
 *
 * @module components/common/__tests__/date-range-picker.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangePicker, { DateRangePicker as NamedDateRangePicker, defaultPresets, useDateRangeParams } from '../DateRangePicker';
import React from 'react';
import { renderHook } from '@testing-library/react';

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <button
      type="button"
      onClick={() =>
        onSelect?.({
          from: new Date('2024-01-01T00:00:00Z'),
          to: new Date('2024-01-02T00:00:00Z'),
        })
      }
    >
      Pick
    </button>
  ),
}));

describe('defaultPresets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should compute Today preset', () => {
    const preset = defaultPresets.find((p) => p.label === 'Today');
    expect(preset).toBeTruthy();
    const v = preset!.getValue();
    expect(v.from).toBeDefined();
    expect(v.to).toBeDefined();
  });
});

describe('DateRangePicker', () => {
  it('should render placeholder when no value', () => {
    render(<NamedDateRangePicker placeholder="Pick dates" />);
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    expect(screen.getByText('Pick dates')).toBeInTheDocument();
  });

  it('should display preset label when value matches preset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const preset = defaultPresets.find((p) => p.label === 'Last 7 days')!;
    const v = preset.getValue();
    render(<NamedDateRangePicker value={v} presets={defaultPresets} />);
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('should render and call onChange when preset clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NamedDateRangePicker onChange={onChange} />);

    // Open popover
    await user.click(screen.getByTestId('date-range-picker'));
    await user.click(screen.getByRole('button', { name: /last 7 days/i }));
    expect(onChange).toHaveBeenCalled();
  });

  it('should show clear selection and call onChange(undefined)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        onChange={onChange}
        value={{ from: new Date('2024-01-01T00:00:00Z'), to: new Date('2024-01-02T00:00:00Z') }}
      />
    );
    await user.click(screen.getByTestId('date-range-picker'));
    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('should close when selecting a complete range via calendar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NamedDateRangePicker onChange={onChange} />);
    await user.click(screen.getByTestId('date-range-picker'));
    await user.click(screen.getByRole('button', { name: /pick/i }));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('useDateRangeParams', () => {
  it('should provide default range and timestamps', () => {
    const { result } = renderHook(() => useDateRangeParams());
    expect(result.current.dateRange?.from).toBeDefined();
    expect(result.current.dateRange?.to).toBeDefined();
    expect(typeof result.current.startTimestamp).toBe('number');
    expect(typeof result.current.endTimestamp).toBe('number');
  });
});

