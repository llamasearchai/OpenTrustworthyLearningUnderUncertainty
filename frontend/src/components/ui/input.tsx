/**
 * Input Component
 *
 * A flexible input component with prefix/suffix slots and state handling.
 *
 * @module components/ui/input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { InputProps } from '@/types/components';

// ============================================================================
// Variants
// ============================================================================

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
      },
    },
    defaultVariants: {
      size: 'default',
      state: 'default',
    },
  }
);

const wrapperVariants = cva(
  'flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
  {
    variants: {
      size: {
        sm: 'h-8 text-xs',
        default: 'h-10',
        lg: 'h-12 text-base',
      },
      state: {
        default: '',
        error: 'border-destructive focus-within:ring-destructive',
        success: 'border-green-500 focus-within:ring-green-500',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      size: 'default',
      state: 'default',
      disabled: false,
    },
  }
);

// ============================================================================
// Component
// ============================================================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      size = 'default',
      prefix,
      suffix,
      isError,
      errorMessage,
      disabled,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const state = isError ? 'error' : 'default';
    const hasAddons = prefix || suffix;

    if (hasAddons) {
      return (
        <div
          className={cn(
            wrapperVariants({ size, state, disabled: !!disabled }),
            className
          )}
          data-testid={testId ? `${testId}-wrapper` : undefined}
        >
          {prefix && (
            <div className="flex items-center pl-3 text-muted-foreground">
              {prefix}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed',
              size === 'sm' && 'px-2 text-xs',
              size === 'lg' && 'px-4 text-base'
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={isError && errorMessage ? `${props.id}-error` : undefined}
            data-testid={testId}
            {...props}
          />
          {suffix && (
            <div className="flex items-center pr-3 text-muted-foreground">
              {suffix}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ size, state }), className)}
        ref={ref}
        disabled={disabled}
        aria-invalid={isError}
        aria-describedby={isError && errorMessage ? `${props.id}-error` : undefined}
        data-testid={testId}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// Exports
// ============================================================================

export { inputVariants };
