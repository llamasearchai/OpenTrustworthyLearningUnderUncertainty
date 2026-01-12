/**
 * Pagination Component
 *
 * Accessible pagination navigation with proper ARIA attributes.
 *
 * @module components/ui/pagination
 */

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

// ============================================================================
// Types
// ============================================================================

export interface PaginationProps extends React.ComponentPropsWithoutRef<'nav'> {
  /** Additional CSS classes */
  className?: string;
}

export interface PaginationContentProps
  extends React.ComponentPropsWithoutRef<'ul'> {
  /** Additional CSS classes */
  className?: string;
}

export interface PaginationItemProps
  extends React.ComponentPropsWithoutRef<'li'> {
  /** Additional CSS classes */
  className?: string;
}

export interface PaginationLinkProps
  extends React.ComponentPropsWithoutRef<'a'> {
  /** Whether this link represents the current page */
  isActive?: boolean;
  /** Size variant */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Whether the link is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface PaginationButtonProps
  extends React.ComponentPropsWithoutRef<'button'> {
  /** Whether this button represents the current page */
  isActive?: boolean;
  /** Size variant */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
}

export interface PaginationPreviousProps extends PaginationLinkProps {
  /** Hide the text label */
  iconOnly?: boolean;
}

export interface PaginationNextProps extends PaginationLinkProps {
  /** Hide the text label */
  iconOnly?: boolean;
}

export interface PaginationEllipsisProps
  extends React.ComponentPropsWithoutRef<'span'> {
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Variants
// ============================================================================

const paginationLinkVariants = cva('', {
  variants: {
    isActive: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    isActive: false,
  },
});

// ============================================================================
// Base Components
// ============================================================================

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  PaginationContentProps
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex flex-row items-center gap-1', className)}
    {...props}
  />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('', className)} {...props} />
  )
);
PaginationItem.displayName = 'PaginationItem';

const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, isActive, size = 'icon', disabled, ...props }, ref) => (
    <a
      ref={ref}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        isActive && 'border-primary bg-primary/10',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    />
  )
);
PaginationLink.displayName = 'PaginationLink';

const PaginationButton = React.forwardRef<
  HTMLButtonElement,
  PaginationButtonProps
>(({ className, isActive, size = 'icon', disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-current={isActive ? 'page' : undefined}
    disabled={disabled}
    className={cn(
      buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size,
      }),
      isActive && 'border-primary bg-primary/10',
      className
    )}
    {...props}
  />
));
PaginationButton.displayName = 'PaginationButton';

const PaginationPrevious = React.forwardRef<
  HTMLAnchorElement,
  PaginationPreviousProps
>(({ className, iconOnly, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to previous page"
    size={iconOnly ? 'icon' : 'default'}
    className={cn('gap-1', !iconOnly && 'pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    {!iconOnly && <span>Previous</span>}
  </PaginationLink>
));
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = React.forwardRef<HTMLAnchorElement, PaginationNextProps>(
  ({ className, iconOnly, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to next page"
      size={iconOnly ? 'icon' : 'default'}
      className={cn('gap-1', !iconOnly && 'pr-2.5', className)}
      {...props}
    >
      {!iconOnly && <span>Next</span>}
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
);
PaginationNext.displayName = 'PaginationNext';

const PaginationFirst = React.forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to first page"
    size="icon"
    className={cn('', className)}
    {...props}
  >
    <ChevronsLeft className="h-4 w-4" />
  </PaginationLink>
));
PaginationFirst.displayName = 'PaginationFirst';

const PaginationLast = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to last page"
      size="icon"
      className={cn('', className)}
      {...props}
    >
      <ChevronsRight className="h-4 w-4" />
    </PaginationLink>
  )
);
PaginationLast.displayName = 'PaginationLast';

const PaginationEllipsis = React.forwardRef<
  HTMLSpanElement,
  PaginationEllipsisProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
));
PaginationEllipsis.displayName = 'PaginationEllipsis';

// ============================================================================
// Controlled Pagination Component
// ============================================================================

export interface ControlledPaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Number of sibling pages to show on each side of current page */
  siblingCount?: number;
  /** Whether to show first/last page buttons */
  showFirstLast?: boolean;
  /** Whether to show previous/next as icons only */
  iconOnly?: boolean;
  /** Whether navigation is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generate page numbers to display
 */
function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 for ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis-end', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + 1 + i
    );
    return [1, 'ellipsis-start', ...rightRange];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, 'ellipsis-start', ...middleRange, 'ellipsis-end', totalPages];
  }

  return [];
}

const ControlledPagination = React.forwardRef<
  HTMLElement,
  ControlledPaginationProps
>(
  (
    {
      page,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = false,
      iconOnly = false,
      disabled = false,
      className,
    },
    ref
  ) => {
    const paginationRange = generatePaginationRange(
      page,
      totalPages,
      siblingCount
    );

    const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
        onPageChange(newPage);
      }
    };

    if (totalPages <= 1) {
      return null;
    }

    return (
      <Pagination ref={ref} className={className}>
        <PaginationContent>
          {showFirstLast && (
            <PaginationItem>
              <PaginationButton
                onClick={() => handlePageChange(1)}
                disabled={disabled || page === 1}
                aria-label="Go to first page"
                size="icon"
              >
                <ChevronsLeft className="h-4 w-4" />
              </PaginationButton>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationButton
              onClick={() => handlePageChange(page - 1)}
              disabled={disabled || page === 1}
              aria-label="Go to previous page"
              size={iconOnly ? 'icon' : 'default'}
              className={cn('gap-1', !iconOnly && 'pl-2.5')}
            >
              <ChevronLeft className="h-4 w-4" />
              {!iconOnly && <span>Previous</span>}
            </PaginationButton>
          </PaginationItem>

          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === 'ellipsis-start' || pageNumber === 'ellipsis-end') {
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={pageNumber}>
                <PaginationButton
                  onClick={() => handlePageChange(pageNumber)}
                  isActive={pageNumber === page}
                  disabled={disabled}
                  aria-label={`Go to page ${pageNumber}`}
                >
                  {pageNumber}
                </PaginationButton>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationButton
              onClick={() => handlePageChange(page + 1)}
              disabled={disabled || page === totalPages}
              aria-label="Go to next page"
              size={iconOnly ? 'icon' : 'default'}
              className={cn('gap-1', !iconOnly && 'pr-2.5')}
            >
              {!iconOnly && <span>Next</span>}
              <ChevronRight className="h-4 w-4" />
            </PaginationButton>
          </PaginationItem>

          {showFirstLast && (
            <PaginationItem>
              <PaginationButton
                onClick={() => handlePageChange(totalPages)}
                disabled={disabled || page === totalPages}
                aria-label="Go to last page"
                size="icon"
              >
                <ChevronsRight className="h-4 w-4" />
              </PaginationButton>
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    );
  }
);
ControlledPagination.displayName = 'ControlledPagination';

// ============================================================================
// Exports
// ============================================================================

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
  PaginationFirst,
  PaginationLast,
  PaginationEllipsis,
  ControlledPagination,
  paginationLinkVariants,
  generatePaginationRange,
};
