/**
 * Skeleton Component
 *
 * Loading placeholder with animation.
 *
 * @module components/ui/skeleton
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SkeletonProps } from '@/types/components';

// ============================================================================
// Component
// ============================================================================

export function Skeleton({
  className,
  width,
  height,
  circle,
  count = 1,
  ...props
}: SkeletonProps) {
  const style: React.CSSProperties = {};

  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }

  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  if (circle) {
    style.borderRadius = '50%';
    if (width && !height) {
      style.height = style.width;
    }
  }

  const skeletonElement = (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={style}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-md bg-muted',
            className
          )}
          style={style}
          role="status"
          aria-label="Loading..."
          {...props}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Variants
// ============================================================================

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4"
          width={index === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 rounded-lg border p-4', className)}>
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: 32,
    default: 40,
    lg: 48,
  };

  return (
    <Skeleton
      circle
      width={sizeMap[size]}
      height={sizeMap[size]}
      className={className}
    />
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-8 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
