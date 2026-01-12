/**
 * DataTable Component
 *
 * Advanced data table with sorting, filtering, pagination, selection,
 * column visibility, row expansion, and export support.
 * Built on @tanstack/react-table for robust table logic.
 *
 * @module components/features/data-table
 */

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ExpandedState,
  type Row,
  type RowSelectionState,
  type FilterFn,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Settings2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight as ExpandIcon,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';

// ============================================================================
// Types
// ============================================================================

/** Filter types supported by columns */
export type FilterType = 'text' | 'select' | 'date-range' | 'number-range';

/** Column alignment options */
export type ColumnAlign = 'left' | 'center' | 'right';

/** Selection mode options */
export type SelectionMode = 'single' | 'multiple' | 'none';

/** Sort order options */
export type SortOrder = 'asc' | 'desc';

/**
 * Column definition interface for DataTable
 */
export interface DataTableColumnDef<TData> {
  /** Unique key for the column (must match data property for automatic value extraction) */
  key: string;
  /** Column header - can be a string or render function */
  header: string | ((column: { isSorted: boolean; sortDirection?: SortOrder }) => React.ReactNode);
  /** Custom cell renderer */
  cell?: (value: unknown, row: TData, rowIndex: number) => React.ReactNode;
  /** Whether column is sortable (default: true) */
  sortable?: boolean;
  /** Whether column is filterable (default: false) */
  filterable?: boolean;
  /** Filter type for column-specific filtering */
  filterType?: FilterType;
  /** Filter options for 'select' filter type */
  filterOptions?: Array<{ label: string; value: string }>;
  /** Column width (CSS value) */
  width?: string | number;
  /** Minimum column width (CSS value) */
  minWidth?: string | number;
  /** Text alignment in cells */
  align?: ColumnAlign;
  /** Whether column is sticky (horizontal scroll) */
  sticky?: boolean;
  /** Whether column is hidden by default */
  hidden?: boolean;
  /** Custom sort function */
  sortFn?: (rowA: TData, rowB: TData, columnKey: string) => number;
  /** Custom filter function */
  filterFn?: (row: TData, columnKey: string, filterValue: unknown) => boolean;
}

/**
 * Sort configuration for controlled sorting
 */
export interface SortConfig {
  /** Column key to sort by */
  sortBy: string;
  /** Sort order */
  sortOrder: SortOrder;
}

/**
 * Multi-column sort configuration
 */
export interface MultiSortConfig {
  /** Array of sort configurations */
  sorting: Array<{ id: string; desc: boolean }>;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
}

/**
 * Column filter value types
 */
export type DateRangeFilter = { from?: Date; to?: Date };
export type NumberRangeFilter = { min?: number; max?: number };
export type ColumnFilterValue = string | string[] | DateRangeFilter | NumberRangeFilter;

/**
 * Column filters map
 */
export type ColumnFilters = Record<string, ColumnFilterValue>;

/**
 * DataTable component props
 */
export interface DataTableProps<TData extends Record<string, unknown>> {
  /** Data to display in the table */
  data: TData[];
  /** Column definitions */
  columns: DataTableColumnDef<TData>[];
  /** Function to extract unique key from each row */
  getRowKey: (row: TData) => string | number;

  // Sorting
  /** Single-column sort configuration (controlled) */
  sortBy?: string;
  /** Sort order for single-column sort */
  sortOrder?: SortOrder;
  /** Callback when sort changes */
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  /** Enable multi-column sorting */
  multiSort?: boolean;
  /** Multi-column sorting state (controlled) */
  sorting?: Array<{ id: string; desc: boolean }>;
  /** Callback when multi-sort changes */
  onMultiSortChange?: (sorting: Array<{ id: string; desc: boolean }>) => void;

  // Filtering
  /** Global search value (controlled) */
  globalFilter?: string;
  /** Callback when global search changes */
  onGlobalFilterChange?: (value: string) => void;
  /** Global search debounce delay in ms (default: 300) */
  globalFilterDebounce?: number;
  /** Column filters (controlled) */
  columnFilters?: ColumnFilters;
  /** Callback when column filters change */
  onFilterChange?: (filters: ColumnFilters) => void;

  // Pagination
  /** Pagination configuration */
  pagination?: PaginationConfig;

  // Selection
  /** Selection mode */
  selectionMode?: SelectionMode;
  /** Selected row keys (controlled) */
  selectedKeys?: Set<string | number>;
  /** Callback when selection changes */
  onSelectionChange?: (keys: Set<string | number>) => void;

  // Row Expansion
  /** Expanded row keys (controlled) */
  expandedKeys?: Set<string | number>;
  /** Callback when expansion changes */
  onExpansionChange?: (keys: Set<string | number>) => void;
  /** Render function for expanded row content */
  renderExpandedRow?: (row: TData) => React.ReactNode;

  // States
  /** Whether table is in loading state */
  isLoading?: boolean;
  /** Number of skeleton rows to show when loading (default: 5) */
  loadingRowCount?: number;
  /** Whether table is in error state */
  isError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;

  // Column Visibility
  /** localStorage key for persisting column visibility */
  columnVisibilityStorageKey?: string;
  /** Initial column visibility state */
  defaultColumnVisibility?: Record<string, boolean>;

  // Export
  /** Enable export functionality */
  enableExport?: boolean;
  /** Custom export filename (without extension) */
  exportFilename?: string;

  // Callbacks
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void;

  // Styling
  /** Additional CSS class name */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for managing column visibility with localStorage persistence
 */
export function useColumnVisibility(
  storageKey?: string,
  defaultVisibility: Record<string, boolean> = {}
): {
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  toggleColumn: (columnId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  resetToDefault: () => void;
} {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`datatable-visibility-${storageKey}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return defaultVisibility;
  });

  // Persist to localStorage
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(
        `datatable-visibility-${storageKey}`,
        JSON.stringify(columnVisibility)
      );
    }
  }, [storageKey, columnVisibility]);

  const toggleColumn = React.useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  const showAllColumns = React.useCallback(() => {
    setColumnVisibility({});
  }, []);

  const hideAllColumns = React.useCallback(() => {
    setColumnVisibility((prev) => {
      const newState: VisibilityState = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = false;
      });
      return newState;
    });
  }, []);

  const resetToDefault = React.useCallback(() => {
    setColumnVisibility(defaultVisibility);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(`datatable-visibility-${storageKey}`);
    }
  }, [defaultVisibility, storageKey]);

  return {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    resetToDefault,
  };
}

/**
 * Hook for debounced value
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export table data to CSV format
 */
export function exportToCSV<TData extends Record<string, unknown>>(
  data: TData[],
  columns: DataTableColumnDef<TData>[],
  filename = 'export'
): void {
  const visibleColumns = columns.filter((col) => !col.hidden);

  // Create header row
  const headers = visibleColumns.map((col) => {
    if (typeof col.header === 'string') {
      return `"${col.header.replace(/"/g, '""')}"`;
    }
    return `"${col.key}"`;
  });

  // Create data rows
  const rows = data.map((row) =>
    visibleColumns.map((col) => {
      const value = row[col.key];
      const strValue = value === null || value === undefined ? '' : String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export table data to JSON format
 */
export function exportToJSON<TData extends Record<string, unknown>>(
  data: TData[],
  columns: DataTableColumnDef<TData>[],
  filename = 'export'
): void {
  const visibleColumns = columns.filter((col) => !col.hidden);
  const keys = visibleColumns.map((col) => col.key);

  // Filter data to only include visible columns
  const filteredData = data.map((row) => {
    const newRow: Record<string, unknown> = {};
    keys.forEach((key) => {
      newRow[key] = row[key];
    });
    return newRow;
  });

  const json = JSON.stringify(filteredData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Empty state component
 */
interface EmptyStateProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

function EmptyState({
  title = 'No results found',
  description = 'Try adjusting your search or filters',
  children,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      {children || (
        <>
          <div className="rounded-full bg-muted p-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </>
      )}
    </div>
  );
}

/**
 * Error state component
 */
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

function ErrorState({
  message = 'An error occurred while loading data',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-destructive">Error</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Loading skeleton rows
 */
interface LoadingSkeletonProps {
  rowCount: number;
  columnCount: number;
  hasSelection: boolean;
  hasExpansion: boolean;
}

function LoadingSkeleton({
  rowCount,
  columnCount,
  hasSelection,
  hasExpansion,
}: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b">
          {hasExpansion && (
            <td className="w-10 px-2">
              <Skeleton className="h-4 w-4" />
            </td>
          )}
          {hasSelection && (
            <td className="w-12 px-4">
              <Skeleton className="h-4 w-4" />
            </td>
          )}
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Column visibility dropdown
 */
interface ColumnVisibilityDropdownProps {
  columns: Array<{ id: string; header: string; visible: boolean }>;
  onToggle: (columnId: string) => void;
}

function ColumnVisibilityDropdown({ columns, onToggle }: ColumnVisibilityDropdownProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button variant="outline" size="icon" aria-label="Toggle column visibility">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          align="end"
        >
          <div className="px-2 py-1.5 text-sm font-semibold">Toggle Columns</div>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-muted" />
          {columns.map((column) => (
            <DropdownMenuPrimitive.CheckboxItem
              key={column.id}
              className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              checked={column.visible}
              onCheckedChange={() => onToggle(column.id)}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <DropdownMenuPrimitive.ItemIndicator>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </DropdownMenuPrimitive.ItemIndicator>
              </span>
              {column.header}
            </DropdownMenuPrimitive.CheckboxItem>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

/**
 * Column filter popover
 */
interface ColumnFilterPopoverProps {
  filterType: FilterType;
  filterValue: ColumnFilterValue | undefined;
  filterOptions?: Array<{ label: string; value: string }>;
  onChange: (value: ColumnFilterValue | undefined) => void;
  columnHeader: string;
}

function ColumnFilterPopover({
  filterType,
  filterValue,
  filterOptions = [],
  onChange,
  columnHeader,
}: ColumnFilterPopoverProps) {
  const hasValue = filterValue !== undefined && filterValue !== '';

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'ml-1 rounded p-1 hover:bg-muted',
            hasValue && 'text-primary'
          )}
          aria-label={`Filter ${columnHeader}`}
        >
          <Search className="h-3 w-3" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
          align="start"
          sideOffset={5}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter {columnHeader}</span>
              {hasValue && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onChange(undefined)}
                >
                  Clear
                </button>
              )}
            </div>

            {filterType === 'text' && (
              <Input
                placeholder="Search..."
                value={(filterValue as string) || ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className="h-8"
              />
            )}

            {filterType === 'select' && (
              <div className="space-y-1 max-h-48 overflow-auto">
                {filterOptions.map((option) => {
                  const selectedValues = (filterValue as string[]) || [];
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-muted"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onChange([...selectedValues, option.value]);
                          } else {
                            const newValues = selectedValues.filter((v) => v !== option.value);
                            onChange(newValues.length > 0 ? newValues : undefined);
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {filterType === 'date-range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={
                      (filterValue as DateRangeFilter)?.from
                        ? (filterValue as DateRangeFilter).from!.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) => {
                      const current = (filterValue as DateRangeFilter) || {};
                      const newValue = e.target.value ? new Date(e.target.value) : undefined;
                      onChange({ ...current, from: newValue });
                    }}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={
                      (filterValue as DateRangeFilter)?.to
                        ? (filterValue as DateRangeFilter).to!.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) => {
                      const current = (filterValue as DateRangeFilter) || {};
                      const newValue = e.target.value ? new Date(e.target.value) : undefined;
                      onChange({ ...current, to: newValue });
                    }}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {filterType === 'number-range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Min</label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={(filterValue as NumberRangeFilter)?.min ?? ''}
                    onChange={(e) => {
                      const current = (filterValue as NumberRangeFilter) || {};
                      const newValue = e.target.value ? Number(e.target.value) : undefined;
                      onChange({ ...current, min: newValue });
                    }}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max</label>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={(filterValue as NumberRangeFilter)?.max ?? ''}
                    onChange={(e) => {
                      const current = (filterValue as NumberRangeFilter) || {};
                      const newValue = e.target.value ? Number(e.target.value) : undefined;
                      onChange({ ...current, max: newValue });
                    }}
                    className="h-8"
                  />
                </div>
              </div>
            )}
          </div>
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * Table header cell with sorting and filtering
 */
interface TableHeaderCellProps<TData> {
  column: DataTableColumnDef<TData>;
  isSorted: boolean;
  sortDirection?: SortOrder;
  onSort: () => void;
  filterValue?: ColumnFilterValue;
  onFilterChange: (value: ColumnFilterValue | undefined) => void;
}

function TableHeaderCell<TData>({
  column,
  isSorted,
  sortDirection,
  onSort,
  filterValue,
  onFilterChange,
}: TableHeaderCellProps<TData>) {
  const isSortable = column.sortable !== false;
  const isFilterable = column.filterable === true;

  const headerContent =
    typeof column.header === 'function'
      ? column.header({ isSorted, sortDirection })
      : column.header;

  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        isSortable && 'cursor-pointer select-none hover:bg-muted/50',
        column.align === 'center' && 'text-center',
        column.align === 'right' && 'text-right',
        column.sticky && 'sticky left-0 z-10 bg-background'
      )}
      style={{
        width: column.width,
        minWidth: column.minWidth ?? column.width,
      }}
      onClick={isSortable ? onSort : undefined}
      aria-sort={
        isSorted
          ? sortDirection === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
      }
    >
      <div className="flex items-center gap-1">
        <span className="flex-1">{headerContent}</span>
        {isFilterable && column.filterType && (
          <ColumnFilterPopover
            filterType={column.filterType}
            filterValue={filterValue}
            filterOptions={column.filterOptions}
            onChange={onFilterChange}
            columnHeader={typeof column.header === 'string' ? column.header : column.key}
          />
        )}
        {isSortable && (
          <span className="ml-1">
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * Pagination controls
 */
interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  selectedCount?: number;
}

function PaginationControls({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  selectedCount,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / pageSize);
  const isFirstPage = page === 1;
  const isLastPage = page >= totalPages;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-muted-foreground">
        {selectedCount !== undefined && selectedCount > 0 ? (
          <span>
            {selectedCount} of {total} row(s) selected
          </span>
        ) : (
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, total)} to{' '}
            {Math.min(page * pageSize, total)} of {total} results
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DataTable Component
 *
 * A comprehensive data table with sorting, filtering, pagination, selection,
 * column visibility, row expansion, and export support.
 */
export function DataTable<TData extends Record<string, unknown>>({
  data,
  columns,
  getRowKey,
  // Sorting
  sortBy,
  sortOrder,
  onSortChange,
  multiSort = false,
  sorting: controlledSorting,
  onMultiSortChange,
  // Filtering
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  globalFilterDebounce = 300,
  columnFilters: controlledColumnFilters,
  onFilterChange,
  // Pagination
  pagination,
  // Selection
  selectionMode = 'none',
  selectedKeys,
  onSelectionChange,
  // Row Expansion
  expandedKeys,
  onExpansionChange,
  renderExpandedRow,
  // States
  isLoading = false,
  loadingRowCount = 5,
  isError = false,
  errorMessage,
  onRetry,
  emptyState,
  emptyTitle,
  emptyDescription,
  // Column Visibility
  columnVisibilityStorageKey,
  defaultColumnVisibility,
  // Export
  enableExport = true,
  exportFilename = 'export',
  // Callbacks
  onRowClick,
  // Styling
  className,
  'data-testid': testId,
}: DataTableProps<TData>) {
  // ============================================================================
  // Internal State
  // ============================================================================

  // Global filter with internal state for uncontrolled mode
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('');
  const globalFilterValue = controlledGlobalFilter ?? internalGlobalFilter;
  const setGlobalFilterValue = onGlobalFilterChange ?? setInternalGlobalFilter;

  // Debounced global filter
  const debouncedGlobalFilter = useDebouncedValue(globalFilterValue, globalFilterDebounce);

  // Column filters with internal state for uncontrolled mode
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFilters>({});
  const columnFiltersValue = controlledColumnFilters ?? internalColumnFilters;
  const setColumnFiltersValue = onFilterChange ?? setInternalColumnFilters;

  // Sorting state
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(() => {
    if (sortBy && sortOrder) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }];
    }
    return controlledSorting || [];
  });

  const sortingState = React.useMemo(() => {
    if (sortBy && sortOrder) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }];
    }
    return controlledSorting || internalSorting;
  }, [sortBy, sortOrder, controlledSorting, internalSorting]);

  // Column visibility
  const {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
  } = useColumnVisibility(columnVisibilityStorageKey, defaultColumnVisibility);

  // Row selection state
  const rowSelection = React.useMemo<RowSelectionState>(() => {
    if (!selectedKeys) return {};
    const selection: RowSelectionState = {};
    data.forEach((row, index) => {
      const rowKey = getRowKey(row);
      if (selectedKeys.has(rowKey)) {
        selection[String(index)] = true;
      }
    });
    return selection;
  }, [selectedKeys, data, getRowKey]);

  // Row expansion state
  const expanded = React.useMemo<ExpandedState>(() => {
    if (!expandedKeys) return {};
    const expansion: ExpandedState = {};
    data.forEach((row, index) => {
      const rowKey = getRowKey(row);
      if (expandedKeys.has(rowKey)) {
        expansion[String(index)] = true;
      }
    });
    return expansion;
  }, [expandedKeys, data, getRowKey]);

  // ============================================================================
  // Table Columns Configuration
  // ============================================================================

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    const cols: ColumnDef<TData>[] = [];

    // Expansion column
    if (renderExpandedRow) {
      cols.push({
        id: '_expand',
        header: () => null,
        cell: ({ row }) => {
          const isExpanded = row.getIsExpanded();
          return (
            <button
              className="p-1 rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            >
              <ExpandIcon
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          );
        },
        size: 40,
        enableSorting: false,
        enableColumnFilter: false,
      });
    }

    // Selection column
    if (selectionMode !== 'none') {
      cols.push({
        id: '_select',
        header: ({ table }) => {
          if (selectionMode === 'single') return null;
          const isAllSelected = table.getIsAllRowsSelected();
          const isSomeSelected = table.getIsSomeRowsSelected();
          return (
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected && !isAllSelected}
              onCheckedChange={(checked) => {
                table.toggleAllRowsSelected(!!checked);
              }}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(checked) => {
              row.toggleSelected(!!checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        size: 48,
        enableSorting: false,
        enableColumnFilter: false,
      });
    }

    // Data columns
    columns.forEach((col) => {
      cols.push({
        id: col.key,
        accessorKey: col.key,
        header: () => null, // We handle header rendering ourselves
        cell: ({ row, getValue }) => {
          const value = getValue();
          if (col.cell) {
            return col.cell(value, row.original, row.index);
          }
          return value === null || value === undefined ? '' : String(value);
        },
        enableSorting: col.sortable !== false,
        enableColumnFilter: col.filterable === true,
        size: typeof col.width === 'number' ? col.width : undefined,
        minSize: typeof col.minWidth === 'number' ? col.minWidth : undefined,
        sortingFn: col.sortFn
          ? (rowA, rowB, columnId) => col.sortFn!(rowA.original, rowB.original, columnId)
          : undefined,
        filterFn: col.filterFn
          ? ((row, columnId, filterValue) =>
              col.filterFn!(row.original, columnId, filterValue)) as FilterFn<TData>
          : undefined,
      });
    });

    return cols;
  }, [columns, selectionMode, renderExpandedRow]);

  // ============================================================================
  // Global Filter Function
  // ============================================================================

  const globalFilterFn = React.useCallback<FilterFn<TData>>(
    (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const search = String(filterValue).toLowerCase();
      return columns.some((col) => {
        const value = row.original[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(search);
      });
    },
    [columns]
  );

  // ============================================================================
  // React Table Instance
  // ============================================================================

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting: sortingState,
      globalFilter: debouncedGlobalFilter,
      columnVisibility,
      rowSelection,
      expanded,
    },
    enableRowSelection: selectionMode !== 'none',
    enableMultiRowSelection: selectionMode === 'multiple',
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sortingState) : updater;

      if (multiSort && onMultiSortChange) {
        onMultiSortChange(newSorting);
      } else if (onSortChange && newSorting.length > 0) {
        const [first] = newSorting;
        onSortChange(first.id, first.desc ? 'desc' : 'asc');
      } else {
        setInternalSorting(newSorting);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      if (!onSelectionChange) return;

      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      const newKeys = new Set<string | number>();

      Object.keys(newSelection).forEach((indexStr) => {
        if (newSelection[indexStr]) {
          const index = parseInt(indexStr, 10);
          const row = data[index];
          if (row) {
            newKeys.add(getRowKey(row));
          }
        }
      });

      onSelectionChange(newKeys);
    },
    onExpandedChange: (updater) => {
      if (!onExpansionChange) return;

      const newExpanded = typeof updater === 'function' ? updater(expanded) : updater;
      const newKeys = new Set<string | number>();

      if (typeof newExpanded === 'object') {
        Object.keys(newExpanded).forEach((indexStr) => {
          if ((newExpanded as Record<string, boolean>)[indexStr]) {
            const index = parseInt(indexStr, 10);
            const row = data[index];
            if (row) {
              newKeys.add(getRowKey(row));
            }
          }
        });
      }

      onExpansionChange(newKeys);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => !!renderExpandedRow,
    globalFilterFn,
    manualPagination: !!pagination,
    manualSorting: !!(onSortChange || onMultiSortChange),
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
  });

  // ============================================================================
  // Visible Columns for Header
  // ============================================================================

  const visibleDataColumns = React.useMemo(
    () => columns.filter((col) => columnVisibility[col.key] !== false && !col.hidden),
    [columns, columnVisibility]
  );

  // ============================================================================
  // Column visibility dropdown data
  // ============================================================================

  const columnVisibilityData = React.useMemo(
    () =>
      columns.map((col) => ({
        id: col.key,
        header: typeof col.header === 'string' ? col.header : col.key,
        visible: columnVisibility[col.key] !== false && !col.hidden,
      })),
    [columns, columnVisibility]
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleColumnFilterChange = React.useCallback(
    (columnId: string, value: ColumnFilterValue | undefined) => {
      const newFilters = { ...columnFiltersValue };
      if (value === undefined) {
        delete newFilters[columnId];
      } else {
        newFilters[columnId] = value;
      }
      setColumnFiltersValue(newFilters);
    },
    [columnFiltersValue, setColumnFiltersValue]
  );

  const handleExportCSV = React.useCallback(() => {
    exportToCSV(data, columns, exportFilename);
  }, [data, columns, exportFilename]);

  const handleExportJSON = React.useCallback(() => {
    exportToJSON(data, columns, exportFilename);
  }, [data, columns, exportFilename]);

  // ============================================================================
  // Render
  // ============================================================================

  const rows = table.getRowModel().rows;
  const hasSelection = selectionMode !== 'none';
  const hasExpansion = !!renderExpandedRow;
  const selectedCount = selectedKeys?.size ?? 0;

  // Error state
  if (isError) {
    return (
      <div className={cn('w-full', className)} data-testid={testId}>
        <div className="rounded-md border">
          <ErrorState message={errorMessage} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} data-testid={testId}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={globalFilterValue}
            onChange={(e) => setGlobalFilterValue(e.target.value)}
            className="pl-10"
            aria-label="Search table"
          />
          {globalFilterValue && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setGlobalFilterValue('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enableExport && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
            </>
          )}
          <ColumnVisibilityDropdown
            columns={columnVisibilityData}
            onToggle={toggleColumn}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b bg-muted/50">
            <tr>
              {hasExpansion && <th className="w-10 px-2" />}
              {hasSelection && (
                <th className="w-12 px-4">
                  {selectionMode === 'multiple' && (
                    <Checkbox
                      checked={table.getIsAllRowsSelected()}
                      indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
                      onCheckedChange={(checked) => table.toggleAllRowsSelected(!!checked)}
                      aria-label="Select all"
                    />
                  )}
                </th>
              )}
              {visibleDataColumns.map((column) => {
                const tableColumn = table.getColumn(column.key);
                const isSorted = tableColumn?.getIsSorted();
                const sortDirection = isSorted ? (isSorted === 'asc' ? 'asc' : 'desc') : undefined;

                return (
                  <TableHeaderCell
                    key={column.key}
                    column={column}
                    isSorted={!!isSorted}
                    sortDirection={sortDirection}
                    onSort={() => tableColumn?.toggleSorting()}
                    filterValue={columnFiltersValue[column.key]}
                    onFilterChange={(value) => handleColumnFilterChange(column.key, value)}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              <LoadingSkeleton
                rowCount={loadingRowCount}
                columnCount={visibleDataColumns.length}
                hasSelection={hasSelection}
                hasExpansion={hasExpansion}
              />
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    visibleDataColumns.length +
                    (hasSelection ? 1 : 0) +
                    (hasExpansion ? 1 : 0)
                  }
                >
                  {emptyState || (
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = getRowKey(row.original);
                const isExpanded = row.getIsExpanded();

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={cn(
                        'border-b transition-colors hover:bg-muted/50',
                        row.getIsSelected() && 'bg-muted',
                        onRowClick && 'cursor-pointer'
                      )}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                    >
                      {hasExpansion && (
                        <td className="w-10 px-2">
                          <button
                            className="p-1 rounded hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              row.toggleExpanded();
                            }}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            <ExpandIcon
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded && 'rotate-90'
                              )}
                            />
                          </button>
                        </td>
                      )}
                      {hasSelection && (
                        <td className="w-12 px-4">
                          <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {visibleDataColumns.map((column) => {
                        const cell = row
                          .getVisibleCells()
                          .find((c) => c.column.id === column.key);

                        return (
                          <td
                            key={column.key}
                            className={cn(
                              'px-4 py-3',
                              column.align === 'center' && 'text-center',
                              column.align === 'right' && 'text-right',
                              column.sticky && 'sticky left-0 z-10 bg-background'
                            )}
                            style={{
                              width: column.width,
                              minWidth: column.minWidth ?? column.width,
                            }}
                          >
                            {cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && renderExpandedRow && (
                      <tr className="bg-muted/30">
                        <td
                          colSpan={
                            visibleDataColumns.length +
                            (hasSelection ? 1 : 0) +
                            (hasExpansion ? 1 : 0)
                          }
                          className="p-4"
                        >
                          {renderExpandedRow(row.original)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          pageSizeOptions={pagination.pageSizeOptions ?? [10, 20, 50, 100]}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          selectedCount={selectedCount}
        />
      )}
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

DataTable.displayName = 'DataTable';
