/**
 * Virtualization Utilities
 *
 * Hooks for virtualizing large lists and grids.
 *
 * @module lib/performance/virtualization
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  RefObject,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface VirtualListOptions {
  count: number;
  getItemSize: (index: number) => number;
  overscan?: number;
  paddingStart?: number;
  paddingEnd?: number;
  initialScrollOffset?: number;
  scrollMargin?: number;
}

export interface VirtualListResult {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollOffset: number;
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  scrollToOffset: (offset: number) => void;
  measureElement: (element: HTMLElement | null, index: number) => void;
  containerProps: {
    ref: RefObject<HTMLDivElement>;
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  scrollerProps: {
    style: React.CSSProperties;
  };
}

export interface VirtualGridOptions {
  rowCount: number;
  columnCount: number;
  rowHeight: number | ((rowIndex: number) => number);
  columnWidth: number | ((columnIndex: number) => number);
  overscanRows?: number;
  overscanColumns?: number;
}

export interface VirtualGridItem {
  rowIndex: number;
  columnIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface VirtualGridResult {
  virtualItems: VirtualGridItem[];
  totalHeight: number;
  totalWidth: number;
  scrollToCell: (rowIndex: number, columnIndex: number) => void;
  containerProps: {
    ref: RefObject<HTMLDivElement>;
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  scrollerProps: {
    style: React.CSSProperties;
  };
}

export interface InfiniteScrollOptions {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

export interface InfiniteScrollResult {
  sentinelRef: RefObject<HTMLDivElement>;
  isFetching: boolean;
}

// ============================================================================
// useVirtualList Hook
// ============================================================================

/**
 * Hook for virtualizing a list of items
 *
 * @example
 * ```tsx
 * function VirtualizedList({ items }) {
 *   const {
 *     virtualItems,
 *     totalSize,
 *     containerProps,
 *     scrollerProps,
 *   } = useVirtualList({
 *     count: items.length,
 *     getItemSize: () => 50,
 *     overscan: 5,
 *   });
 *
 *   return (
 *     <div {...containerProps} style={{ height: 400, overflow: 'auto' }}>
 *       <div {...scrollerProps}>
 *         {virtualItems.map((virtualItem) => (
 *           <div
 *             key={virtualItem.index}
 *             style={{
 *               position: 'absolute',
 *               top: virtualItem.start,
 *               height: virtualItem.size,
 *             }}
 *           >
 *             {items[virtualItem.index]}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVirtualList(options: VirtualListOptions): VirtualListResult {
  const {
    count,
    getItemSize,
    overscan = 3,
    paddingStart = 0,
    paddingEnd = 0,
    initialScrollOffset = 0,
    scrollMargin = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(initialScrollOffset);
  const [containerSize, setContainerSize] = useState(0);
  const measuredSizes = useRef<Map<number, number>>(new Map());

  // Calculate item positions
  const { itemOffsets, totalSize } = useMemo(() => {
    const offsets: number[] = [];
    let total = paddingStart;

    for (let i = 0; i < count; i++) {
      offsets.push(total);
      const measuredSize = measuredSizes.current.get(i);
      const size = measuredSize !== undefined ? measuredSize : getItemSize(i);
      total += size;
    }

    return { itemOffsets: offsets, totalSize: total + paddingEnd };
  }, [count, getItemSize, paddingStart, paddingEnd]);

  // Find visible range
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (containerSize === 0 || count === 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] };
    }

    const viewportStart = scrollOffset - scrollMargin;
    const viewportEnd = scrollOffset + containerSize + scrollMargin;

    // Binary search for start index
    let start = 0;
    let end = count - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const itemEnd = itemOffsets[mid] + getItemSize(mid);
      if (itemEnd < viewportStart) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    const visibleStart = Math.max(0, start - overscan);

    // Find end index
    start = visibleStart;
    end = count - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (itemOffsets[mid] > viewportEnd) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }
    const visibleEnd = Math.min(count - 1, end + overscan);

    // Generate virtual items
    const items: VirtualItem[] = [];
    for (let i = visibleStart; i <= visibleEnd; i++) {
      const measuredSize = measuredSizes.current.get(i);
      const size = measuredSize !== undefined ? measuredSize : getItemSize(i);
      items.push({
        index: i,
        start: itemOffsets[i],
        end: itemOffsets[i] + size,
        size,
      });
    }

    return { startIndex: visibleStart, endIndex: visibleEnd, virtualItems: items };
  }, [scrollOffset, containerSize, count, itemOffsets, getItemSize, overscan, scrollMargin]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollOffset(target.scrollTop);
  }, []);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerSize(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, options: { align?: 'start' | 'center' | 'end' } = {}) => {
      const { align = 'start' } = options;
      const container = containerRef.current;
      if (!container || index < 0 || index >= count) return;

      const itemStart = itemOffsets[index];
      const itemSize = getItemSize(index);
      let scrollTo: number;

      switch (align) {
        case 'center':
          scrollTo = itemStart - containerSize / 2 + itemSize / 2;
          break;
        case 'end':
          scrollTo = itemStart - containerSize + itemSize;
          break;
        case 'start':
        default:
          scrollTo = itemStart;
      }

      container.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
    },
    [count, itemOffsets, getItemSize, containerSize]
  );

  // Scroll to offset
  const scrollToOffset = useCallback((offset: number) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }, []);

  // Measure element
  const measureElement = useCallback(
    (element: HTMLElement | null, index: number) => {
      if (!element) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          measuredSizes.current.set(index, entry.contentRect.height);
        }
      });

      observer.observe(element);
      measuredSizes.current.set(index, element.getBoundingClientRect().height);

      return () => observer.disconnect();
    },
    []
  );

  return {
    virtualItems,
    totalSize,
    scrollOffset,
    scrollToIndex,
    scrollToOffset,
    measureElement,
    containerProps: {
      ref: containerRef,
      onScroll: handleScroll,
      style: { position: 'relative', overflow: 'auto' },
    },
    scrollerProps: {
      style: { height: totalSize, position: 'relative' },
    },
  };
}

// ============================================================================
// useVirtualGrid Hook
// ============================================================================

/**
 * Hook for virtualizing a grid of items
 *
 * @example
 * ```tsx
 * function VirtualizedGrid({ data, columns }) {
 *   const rows = Math.ceil(data.length / columns);
 *
 *   const {
 *     virtualItems,
 *     totalHeight,
 *     totalWidth,
 *     containerProps,
 *     scrollerProps,
 *   } = useVirtualGrid({
 *     rowCount: rows,
 *     columnCount: columns,
 *     rowHeight: 100,
 *     columnWidth: 150,
 *   });
 *
 *   return (
 *     <div {...containerProps} style={{ height: 500, width: '100%', overflow: 'auto' }}>
 *       <div {...scrollerProps}>
 *         {virtualItems.map((cell) => {
 *           const dataIndex = cell.rowIndex * columns + cell.columnIndex;
 *           if (dataIndex >= data.length) return null;
 *
 *           return (
 *             <div
 *               key={`${cell.rowIndex}-${cell.columnIndex}`}
 *               style={{
 *                 position: 'absolute',
 *                 top: cell.top,
 *                 left: cell.left,
 *                 width: cell.width,
 *                 height: cell.height,
 *               }}
 *             >
 *               {data[dataIndex]}
 *             </div>
 *           );
 *         })}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVirtualGrid(options: VirtualGridOptions): VirtualGridResult {
  const {
    rowCount,
    columnCount,
    rowHeight,
    columnWidth,
    overscanRows = 2,
    overscanColumns = 2,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const getRowHeight = useCallback(
    (index: number) => (typeof rowHeight === 'function' ? rowHeight(index) : rowHeight),
    [rowHeight]
  );

  const getColumnWidth = useCallback(
    (index: number) => (typeof columnWidth === 'function' ? columnWidth(index) : columnWidth),
    [columnWidth]
  );

  // Calculate dimensions
  const { rowOffsets, totalHeight, columnOffsets, totalWidth } = useMemo(() => {
    const rowOffs: number[] = [];
    let height = 0;
    for (let i = 0; i < rowCount; i++) {
      rowOffs.push(height);
      height += getRowHeight(i);
    }

    const colOffs: number[] = [];
    let width = 0;
    for (let i = 0; i < columnCount; i++) {
      colOffs.push(width);
      width += getColumnWidth(i);
    }

    return { rowOffsets: rowOffs, totalHeight: height, columnOffsets: colOffs, totalWidth: width };
  }, [rowCount, columnCount, getRowHeight, getColumnWidth]);

  // Find visible cells
  const virtualItems = useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) {
      return [];
    }

    // Find visible row range
    let rowStart = 0;
    let rowEnd = rowCount - 1;

    // Binary search for start row
    let lo = 0;
    let hi = rowCount - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (rowOffsets[mid] + getRowHeight(mid) < scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    rowStart = Math.max(0, lo - overscanRows);

    // Find end row
    lo = rowStart;
    hi = rowCount - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (rowOffsets[mid] > scrollTop + containerHeight) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    rowEnd = Math.min(rowCount - 1, hi + overscanRows);

    // Find visible column range
    let colStart = 0;
    let colEnd = columnCount - 1;

    lo = 0;
    hi = columnCount - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (columnOffsets[mid] + getColumnWidth(mid) < scrollLeft) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    colStart = Math.max(0, lo - overscanColumns);

    lo = colStart;
    hi = columnCount - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (columnOffsets[mid] > scrollLeft + containerWidth) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    colEnd = Math.min(columnCount - 1, hi + overscanColumns);

    // Generate virtual items
    const items: VirtualGridItem[] = [];
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        items.push({
          rowIndex: row,
          columnIndex: col,
          top: rowOffsets[row],
          left: columnOffsets[col],
          width: getColumnWidth(col),
          height: getRowHeight(row),
        });
      }
    }

    return items;
  }, [
    scrollTop,
    scrollLeft,
    containerWidth,
    containerHeight,
    rowCount,
    columnCount,
    rowOffsets,
    columnOffsets,
    getRowHeight,
    getColumnWidth,
    overscanRows,
    overscanColumns,
  ]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Scroll to cell
  const scrollToCell = useCallback(
    (rowIndex: number, columnIndex: number) => {
      const container = containerRef.current;
      if (!container) return;
      if (rowIndex < 0 || rowIndex >= rowCount) return;
      if (columnIndex < 0 || columnIndex >= columnCount) return;

      container.scrollTo({
        top: rowOffsets[rowIndex],
        left: columnOffsets[columnIndex],
        behavior: 'smooth',
      });
    },
    [rowCount, columnCount, rowOffsets, columnOffsets]
  );

  return {
    virtualItems,
    totalHeight,
    totalWidth,
    scrollToCell,
    containerProps: {
      ref: containerRef,
      onScroll: handleScroll,
      style: { position: 'relative', overflow: 'auto' },
    },
    scrollerProps: {
      style: { height: totalHeight, width: totalWidth, position: 'relative' },
    },
  };
}

// ============================================================================
// useInfiniteScroll Hook
// ============================================================================

/**
 * Hook for implementing infinite scroll
 *
 * @example
 * ```tsx
 * function InfiniteList({ items, hasMore, loadMore, loading }) {
 *   const { sentinelRef, isFetching } = useInfiniteScroll({
 *     hasNextPage: hasMore,
 *     isFetching: loading,
 *     onLoadMore: loadMore,
 *     threshold: 0.5,
 *   });
 *
 *   return (
 *     <div>
 *       {items.map((item) => (
 *         <ItemCard key={item.id} item={item} />
 *       ))}
 *       <div ref={sentinelRef}>
 *         {isFetching && <Spinner />}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInfiniteScroll(options: InfiniteScrollOptions): InfiniteScrollResult {
  const { hasNextPage, isFetching, onLoadMore, threshold = 0.5 } = options;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onLoadMore);

  useEffect(() => {
    callbackRef.current = onLoadMore;
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetching) {
          callbackRef.current();
        }
      },
      { threshold }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, threshold]);

  return {
    sentinelRef,
    isFetching,
  };
}

// ============================================================================
// Window Scroll Virtual List
// ============================================================================

export interface UseWindowVirtualListOptions extends VirtualListOptions {
  scrollElement?: HTMLElement | Window | null;
}

/**
 * Hook for virtualizing a list with window scroll
 */
export function useWindowVirtualList(options: UseWindowVirtualListOptions) {
  const { scrollElement = typeof window !== 'undefined' ? window : null, ...listOptions } = options;

  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollElement) return;

    const handleScroll = () => {
      if (scrollElement === window) {
        setScrollOffset(window.scrollY);
      } else {
        setScrollOffset((scrollElement as HTMLElement).scrollTop);
      }
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElement]);

  const result = useVirtualList({
    ...listOptions,
    initialScrollOffset: scrollOffset,
  });

  return {
    ...result,
    containerRef,
  };
}
