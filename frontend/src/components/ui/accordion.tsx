/**
 * Accordion Component
 *
 * Accessible accordion component built on Radix UI Accordion primitive.
 *
 * @module components/ui/accordion
 */

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type AccordionType = 'single' | 'multiple';

export interface AccordionSingleProps
  extends Omit<React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>, 'type'> {
  /** Accordion type - single allows only one item open at a time */
  type: 'single';
  /** Controlled value for single type */
  value?: string;
  /** Default value for single type (uncontrolled) */
  defaultValue?: string;
  /** Callback when value changes (single type) */
  onValueChange?: (value: string) => void;
  /** Whether single accordion can be fully collapsed */
  collapsible?: boolean;
  /** Whether the accordion is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface AccordionMultipleProps
  extends Omit<React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>, 'type'> {
  /** Accordion type - multiple allows multiple items open */
  type: 'multiple';
  /** Controlled value for multiple type */
  value?: string[];
  /** Default value for multiple type (uncontrolled) */
  defaultValue?: string[];
  /** Callback when value changes (multiple type) */
  onValueChange?: (value: string[]) => void;
  /** Whether the accordion is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export interface AccordionItemProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  /** Unique value for this item */
  value: string;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Hide the chevron icon */
  hideChevron?: boolean;
  /** Custom icon to use instead of chevron */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
}

export interface AccordionContentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  /** Force mount even when closed (useful for SEO) */
  forceMount?: true;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variants
// ============================================================================

const accordionVariants = cva('w-full', {
  variants: {
    variant: {
      default: '',
      bordered: 'border rounded-md',
      separated: 'space-y-2',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const accordionItemVariants = cva('border-b', {
  variants: {
    variant: {
      default: 'border-b',
      bordered: 'border-b last:border-b-0',
      separated: 'border rounded-md',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const accordionTriggerVariants = cva(
  'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
  {
    variants: {
      size: {
        sm: 'py-2 text-sm',
        default: 'py-4 text-base',
        lg: 'py-6 text-lg',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const accordionContentVariants = cva(
  'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
  {
    variants: {
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

// ============================================================================
// Context for Variant Propagation
// ============================================================================

interface AccordionContextValue {
  variant: 'default' | 'bordered' | 'separated';
  size: 'sm' | 'default' | 'lg';
}

const AccordionContext = React.createContext<AccordionContextValue>({
  variant: 'default',
  size: 'default',
});

const useAccordionContext = () => React.useContext(AccordionContext);

// ============================================================================
// Components
// ============================================================================

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  AccordionProps & { variant?: 'default' | 'bordered' | 'separated'; size?: 'sm' | 'default' | 'lg' }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => (
  <AccordionContext.Provider value={{ variant, size }}>
    <AccordionPrimitive.Root
      ref={ref}
      className={cn(accordionVariants({ variant }), className)}
      {...props}
    />
  </AccordionContext.Provider>
));
Accordion.displayName = 'Accordion';

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, disabled, ...props }, ref) => {
  const { variant } = useAccordionContext();

  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(accordionItemVariants({ variant }), className)}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    />
  );
});
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, hideChevron, icon, iconPosition = 'right', ...props }, ref) => {
  const { size } = useAccordionContext();

  const chevronIcon = icon || (
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
  );

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          accordionTriggerVariants({ size }),
          iconPosition === 'left' && 'flex-row-reverse justify-end gap-2',
          className
        )}
        {...props}
      >
        {iconPosition === 'left' && !hideChevron && chevronIcon}
        <span className="flex-1 text-left">{children}</span>
        {iconPosition === 'right' && !hideChevron && chevronIcon}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(({ className, children, ...props }, ref) => {
  const { size } = useAccordionContext();

  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(accordionContentVariants({ size }), className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </AccordionPrimitive.Content>
  );
});
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

// ============================================================================
// Exports
// ============================================================================

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  accordionVariants,
  accordionItemVariants,
  accordionTriggerVariants,
  accordionContentVariants,
};
