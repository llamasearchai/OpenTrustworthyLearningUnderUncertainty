/**
 * Breadcrumb Component
 *
 * Accessible breadcrumb navigation component with proper ARIA attributes.
 *
 * @module components/ui/breadcrumb
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {
  /** Custom separator element */
  separator?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbListProps
  extends React.ComponentPropsWithoutRef<'ol'> {
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbItemProps
  extends React.ComponentPropsWithoutRef<'li'> {
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<'a'> {
  /** Render as child element (for custom link components) */
  asChild?: boolean;
  /** Whether this is the current/active page */
  isCurrent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbSeparatorProps
  extends React.ComponentPropsWithoutRef<'li'> {
  /** Custom separator content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbPageProps
  extends React.ComponentPropsWithoutRef<'span'> {
  /** Additional CSS classes */
  className?: string;
}

export interface BreadcrumbEllipsisProps
  extends React.ComponentPropsWithoutRef<'span'> {
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variants
// ============================================================================

const breadcrumbVariants = cva('', {
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
});

const breadcrumbLinkVariants = cva(
  'transition-colors hover:text-foreground',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground',
        underline: 'text-muted-foreground underline-offset-4 hover:underline',
      },
      isCurrent: {
        true: 'font-normal text-foreground pointer-events-none',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      isCurrent: false,
    },
  }
);

// ============================================================================
// Context for Separator Propagation
// ============================================================================

interface BreadcrumbContextValue {
  separator: React.ReactNode;
  size: 'sm' | 'default' | 'lg';
}

const BreadcrumbContext = React.createContext<BreadcrumbContextValue>({
  separator: <ChevronRight className="h-3.5 w-3.5" />,
  size: 'default',
});

const useBreadcrumbContext = () => React.useContext(BreadcrumbContext);

// ============================================================================
// Components
// ============================================================================

const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps & { size?: 'sm' | 'default' | 'lg' }
>(({ className, separator, size = 'default', ...props }, ref) => (
  <BreadcrumbContext.Provider
    value={{
      separator: separator || <ChevronRight className="h-3.5 w-3.5" />,
      size,
    }}
  >
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn(breadcrumbVariants({ size }), className)}
      {...props}
    />
  </BreadcrumbContext.Provider>
));
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-muted-foreground sm:gap-2.5',
        className
      )}
      {...props}
    />
  )
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  )
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps & { variant?: 'default' | 'underline' }
>(({ asChild, className, isCurrent, variant = 'default', ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      className={cn(breadcrumbLinkVariants({ variant, isCurrent }), className)}
      aria-current={isCurrent ? 'page' : undefined}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(({ children, className, ...props }, ref) => {
  const { separator } = useBreadcrumbContext();

  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? separator}
    </li>
  );
});
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  )
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbEllipsisProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
));
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// ============================================================================
// Helper Components for Collapsing Long Paths
// ============================================================================

export interface BreadcrumbWithEllipsisProps {
  /** All breadcrumb items */
  items: Array<{
    label: string;
    href?: string;
    isCurrent?: boolean;
  }>;
  /** Maximum visible items (excluding first and last) */
  maxVisibleItems?: number;
  /** Custom separator */
  separator?: React.ReactNode;
  /** Render custom link component */
  renderLink?: (props: { href: string; children: React.ReactNode }) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const BreadcrumbWithEllipsis = React.forwardRef<
  HTMLElement,
  BreadcrumbWithEllipsisProps
>(({ items, maxVisibleItems = 3, separator, renderLink, className }, ref) => {
  const shouldCollapse = items.length > maxVisibleItems + 2;

  let visibleItems = items;
  if (shouldCollapse) {
    // Show first item, ellipsis, and last maxVisibleItems items
    const startItems = items.slice(0, 1);
    const endItems = items.slice(-maxVisibleItems);
    visibleItems = [...startItems, { label: '...', href: undefined }, ...endItems];
  }

  return (
    <Breadcrumb ref={ref} separator={separator} className={className}>
      <BreadcrumbList>
        {visibleItems.map((item, index) => (
          <React.Fragment key={item.label + index}>
            <BreadcrumbItem>
              {item.label === '...' ? (
                <BreadcrumbEllipsis />
              ) : item.isCurrent || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : renderLink ? (
                renderLink({ href: item.href, children: item.label })
              ) : (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < visibleItems.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
});
BreadcrumbWithEllipsis.displayName = 'BreadcrumbWithEllipsis';

// ============================================================================
// Exports
// ============================================================================

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbEllipsis,
  BreadcrumbWithEllipsis,
  breadcrumbVariants,
  breadcrumbLinkVariants,
};
