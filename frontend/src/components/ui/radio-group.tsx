/**
 * RadioGroup Component
 *
 * Accessible radio group built on Radix UI RadioGroup primitive.
 *
 * @module components/ui/radio-group
 */

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  /** Controlled value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Whether a selection is required */
  required?: boolean;
  /** Orientation of the radio group */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  /** Value for this radio item */
  value: string;
  /** ID for the radio item */
  id?: string;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variants
// ============================================================================

const radioGroupVariants = cva('grid gap-2', {
  variants: {
    orientation: {
      horizontal: 'grid-flow-col auto-cols-max',
      vertical: 'grid-flow-row',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

const radioItemVariants = cva(
  'aspect-square rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-3.5 w-3.5',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const radioIndicatorVariants = cva('fill-current text-current', {
  variants: {
    size: {
      sm: 'h-2 w-2',
      default: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

// ============================================================================
// Components
// ============================================================================

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(
  (
    {
      className,
      orientation = 'vertical',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    return (
      <RadioGroupPrimitive.Root
        ref={ref}
        className={cn(radioGroupVariants({ orientation }), className)}
        disabled={disabled}
        required={required}
        orientation={orientation}
        aria-required={required}
        {...props}
      />
    );
  }
);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, size = 'default', disabled, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(radioItemVariants({ size }), className)}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className={cn(radioIndicatorVariants({ size }))} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// ============================================================================
// Label Component for Radio Items
// ============================================================================

export interface RadioGroupLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Associated radio item ID */
  htmlFor?: string;
  /** Size variant to match radio item */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the associated radio is disabled */
  disabled?: boolean;
}

const radioLabelVariants = cva(
  'font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-70',
        false: 'cursor-pointer',
      },
    },
    defaultVariants: {
      size: 'default',
      disabled: false,
    },
  }
);

const RadioGroupLabel = React.forwardRef<
  HTMLLabelElement,
  RadioGroupLabelProps
>(({ className, size = 'default', disabled, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(radioLabelVariants({ size, disabled: !!disabled }), className)}
      {...props}
    />
  );
});
RadioGroupLabel.displayName = 'RadioGroupLabel';

// ============================================================================
// Compound Component for Radio Item with Label
// ============================================================================

export interface RadioGroupItemWithLabelProps extends RadioGroupItemProps {
  /** Label text for the radio item */
  label: string;
  /** Description text below the label */
  description?: string;
}

const RadioGroupItemWithLabel = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemWithLabelProps
>(({ label, description, id, size = 'default', disabled, className, ...props }, ref) => {
  const generatedId = id || `radio-${props.value}`;

  return (
    <div className="flex items-start space-x-3">
      <RadioGroupItem
        ref={ref}
        id={generatedId}
        size={size}
        disabled={disabled}
        className={cn('mt-0.5', className)}
        {...props}
      />
      <div className="grid gap-1.5 leading-none">
        <RadioGroupLabel
          htmlFor={generatedId}
          size={size}
          disabled={disabled}
        >
          {label}
        </RadioGroupLabel>
        {description && (
          <p className={cn(
            'text-muted-foreground',
            size === 'sm' && 'text-xs',
            size === 'default' && 'text-sm',
            size === 'lg' && 'text-base',
            disabled && 'opacity-70'
          )}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
RadioGroupItemWithLabel.displayName = 'RadioGroupItemWithLabel';

// ============================================================================
// Exports
// ============================================================================

export {
  RadioGroup,
  RadioGroupItem,
  RadioGroupLabel,
  RadioGroupItemWithLabel,
  radioGroupVariants,
  radioItemVariants,
};
