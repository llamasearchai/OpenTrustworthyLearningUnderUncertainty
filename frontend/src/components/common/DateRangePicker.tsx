/**
 * DateRangePicker Component
 *
 * A date range picker with presets for filtering dashboard data.
 *
 * @module components/common/DateRangePicker
 */

import { useState, useMemo } from 'react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Define our own DateRange type to avoid version conflicts
export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

// ============================================================================
// Types
// ============================================================================

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  presets?: DatePreset[];
}

export interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

// ============================================================================
// Default Presets
// ============================================================================

export const defaultPresets: DatePreset[] = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { from: startOfDay(today), to: endOfDay(today) };
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 90 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 89)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 6 months',
    getValue: () => ({
      from: startOfDay(subMonths(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last year',
    getValue: () => ({
      from: startOfDay(subMonths(new Date(), 12)),
      to: endOfDay(new Date()),
    }),
  },
];

// ============================================================================
// Component
// ============================================================================

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  className,
  disabled = false,
  align = 'start',
  presets = defaultPresets,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value?.from || new Date());

  // Format the display text
  const displayText = useMemo(() => {
    if (!value?.from) return placeholder;

    if (value.to) {
      // Check if it matches a preset
      const matchingPreset = presets.find((preset) => {
        const presetValue = preset.getValue();
        return (
          presetValue.from?.getTime() === value.from?.getTime() &&
          presetValue.to?.getTime() === value.to?.getTime()
        );
      });

      if (matchingPreset) {
        return matchingPreset.label;
      }

      return `${format(value.from, 'MMM d, yyyy')} - ${format(value.to, 'MMM d, yyyy')}`;
    }

    return format(value.from, 'MMM d, yyyy');
  }, [value, placeholder, presets]);

  const handlePresetClick = (preset: DatePreset) => {
    const newRange = preset.getValue();
    onChange?.(newRange);
    setMonth(newRange.from || new Date());
    setIsOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range);
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange?.(undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          data-testid="date-range-picker"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">{displayText}</span>
          <ChevronDown className={cn(
            'ml-2 h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-2 space-y-1 min-w-[140px]">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Quick Select
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start font-normal"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
            {value && (
              <>
                <div className="my-2 border-t" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal text-muted-foreground"
                  onClick={handleClear}
                >
                  Clear selection
                </Button>
              </>
            )}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={month}
              selected={value}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Hook for URL-synced date range
// ============================================================================

export function useDateRangeParams() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    // Default to last 30 days
    return {
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    };
  });

  return {
    dateRange,
    setDateRange,
    startTimestamp: dateRange?.from?.getTime(),
    endTimestamp: dateRange?.to?.getTime(),
  };
}

export default DateRangePicker;
