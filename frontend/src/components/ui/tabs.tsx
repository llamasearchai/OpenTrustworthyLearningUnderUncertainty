/**
 * Tabs Component
 *
 * Accessible tabs component built on Radix UI Tabs primitive.
 *
 * @module components/ui/tabs
 */

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  /** Default active tab value (uncontrolled) */
  defaultValue?: string;
  /** Controlled active tab value */
  value?: string;
  /** Callback when active tab changes */
  onValueChange?: (value: string) => void;
  /** Orientation of the tabs */
  orientation?: 'horizontal' | 'vertical';
  /** Activation mode */
  activationMode?: 'automatic' | 'manual';
  /** Additional CSS classes */
  className?: string;
}

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'outline' | 'pills';
  /** Additional CSS classes */
  className?: string;
}

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Value identifying this tab */
  value: string;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  /** Value identifying which tab this content belongs to */
  value: string;
  /** Force mount even when not active (useful for animations) */
  forceMount?: true;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variants
// ============================================================================

const tabsListVariants = cva(
  'inline-flex items-center justify-center text-muted-foreground',
  {
    variants: {
      orientation: {
        horizontal: 'flex-row',
        vertical: 'flex-col',
      },
      variant: {
        default: 'rounded-md bg-muted p-1',
        outline: 'border-b border-border',
        pills: 'gap-2',
      },
      size: {
        sm: 'h-8',
        default: 'h-10',
        lg: 'h-12',
      },
    },
    compoundVariants: [
      {
        orientation: 'vertical',
        variant: 'default',
        className: 'h-auto w-auto flex-col',
      },
      {
        orientation: 'vertical',
        variant: 'outline',
        className: 'h-auto w-auto border-b-0 border-r flex-col',
      },
      {
        orientation: 'vertical',
        variant: 'pills',
        className: 'h-auto w-auto flex-col',
      },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
      size: 'default',
    },
  }
);

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        outline:
          'border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-foreground -mb-px',
        pills:
          'rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    compoundVariants: [
      {
        variant: 'outline',
        className: '-mb-px',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const tabsContentVariants = cva(
  'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      orientation: {
        horizontal: 'mt-2',
        vertical: 'mt-0 ml-4',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }
);

// ============================================================================
// Context for Variant Propagation
// ============================================================================

interface TabsContextValue {
  variant: 'default' | 'outline' | 'pills';
  size: 'sm' | 'default' | 'lg';
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = React.createContext<TabsContextValue>({
  variant: 'default',
  size: 'default',
  orientation: 'horizontal',
});

const useTabsContext = () => React.useContext(TabsContext);

// ============================================================================
// Components
// ============================================================================

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn(
      orientation === 'vertical' && 'flex flex-row',
      className
    )}
    orientation={orientation}
    {...props}
  />
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  // Get orientation from parent Tabs via data attribute or context
  const orientation =
    (props as { 'data-orientation'?: 'horizontal' | 'vertical' })['data-orientation'] || 'horizontal';

  return (
    <TabsContext.Provider value={{ variant, size, orientation }}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          tabsListVariants({ orientation, variant, size }),
          className
        )}
        {...props}
      />
    </TabsContext.Provider>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, disabled, ...props }, ref) => {
  const { variant, size } = useTabsContext();

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant, size }), className)}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => {
  const { orientation } = useTabsContext();

  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(tabsContentVariants({ orientation }), className)}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ============================================================================
// Exports
// ============================================================================

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
  tabsContentVariants,
};
