/**
 * DataTable Component Stories
 *
 * Comprehensive Storybook stories for the DataTable component demonstrating
 * sorting, filtering, pagination, selection, and all data table features.
 *
 * @module components/features/DataTable.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import { DataTable } from './data-table';
import type { DataTableColumnDef } from './data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ExternalLink, Edit, Trash2 } from 'lucide-react';
import * as React from 'react';
import { faker } from '@faker-js/faker';

// ============================================================================
// Sample Data Types
// ============================================================================

interface SampleRow {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  role: string;
  createdAt: Date;
  lastActive: string;
  score: number;
  department: string;
  [key: string]: unknown;
}

// ============================================================================
// Sample Data Generator
// ============================================================================

const generateSampleData = (count: number): SampleRow[] => {
  faker.seed(42); // Consistent data across renders
  return Array.from({ length: count }, (_, index) => ({
    id: `user-${index + 1}`,
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    status: faker.helpers.arrayElement(['active', 'inactive', 'pending']) as SampleRow['status'],
    role: faker.helpers.arrayElement(['Admin', 'Editor', 'Viewer', 'Owner']),
    createdAt: faker.date.past({ years: 2 }),
    lastActive: faker.date.recent({ days: 30 }).toISOString(),
    score: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
    department: faker.helpers.arrayElement(['Engineering', 'Design', 'Marketing', 'Sales', 'Support']),
  }));
};

const sampleData = generateSampleData(100);
const smallDataset = generateSampleData(5);

// ============================================================================
// Column Definitions
// ============================================================================

const columns: DataTableColumnDef<SampleRow>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    filterable: true,
    filterType: 'text',
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    cell: (value) => (
      <a
        href={`mailto:${value}`}
        className="text-primary hover:underline flex items-center gap-1"
      >
        {String(value)}
        <ExternalLink className="h-3 w-3" />
      </a>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Pending', value: 'pending' },
    ],
    cell: (value) => {
      const status = value as SampleRow['status'];
      const variants: Record<SampleRow['status'], 'default' | 'secondary' | 'destructive'> = {
        active: 'default',
        inactive: 'secondary',
        pending: 'destructive',
      };
      return (
        <Badge variant={variants[status] || 'default'} className="capitalize">
          {status}
        </Badge>
      );
    },
    align: 'center',
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Admin', value: 'Admin' },
      { label: 'Editor', value: 'Editor' },
      { label: 'Viewer', value: 'Viewer' },
      { label: 'Owner', value: 'Owner' },
    ],
  },
  {
    key: 'department',
    header: 'Department',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Engineering', value: 'Engineering' },
      { label: 'Design', value: 'Design' },
      { label: 'Marketing', value: 'Marketing' },
      { label: 'Sales', value: 'Sales' },
      { label: 'Support', value: 'Support' },
    ],
  },
  {
    key: 'score',
    header: 'Score',
    sortable: true,
    filterable: true,
    filterType: 'number-range',
    cell: (value) => {
      const score = Number(value);
      const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
      return <span className={`font-medium ${color}`}>{score.toFixed(1)}</span>;
    },
    align: 'right',
  },
  {
    key: 'lastActive',
    header: 'Last Active',
    sortable: true,
    filterable: true,
    filterType: 'date-range',
    cell: (value) => {
      const date = new Date(value as string);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    cell: (value) => {
      const date = new Date(value as Date);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
  },
];

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof DataTable<SampleRow>> = {
  title: 'Components/Features/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Advanced data table component with comprehensive features for displaying and interacting with tabular data.
Built on @tanstack/react-table for robust table logic.

## Features
- **Sorting**: Single and multi-column sorting with custom sort functions
- **Filtering**: Global search and column-specific filters (text, select, date-range, number-range)
- **Pagination**: Configurable page sizes with navigation controls
- **Selection**: Single and multiple row selection modes
- **Column Visibility**: Toggle columns with localStorage persistence
- **Row Expansion**: Expandable rows for detailed views
- **Export**: CSV and JSON export functionality
- **Loading/Error States**: Built-in loading skeletons and error handling
- **Accessibility**: Full keyboard navigation and ARIA attributes

## Usage

\`\`\`tsx
import { DataTable } from '@/components/features/data-table';

<DataTable
  data={users}
  columns={columns}
  getRowKey={(row) => row.id}
  pagination={{
    page: 1,
    pageSize: 10,
    total: 100,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
/>
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'table-duplicate-name', enabled: false },
        ],
      },
    },
  },
  argTypes: {
    data: {
      description: 'Array of data to display',
      control: false,
      table: {
        type: { summary: 'T[]' },
      },
    },
    columns: {
      description: 'Column definitions',
      control: false,
      table: {
        type: { summary: 'DataTableColumnDef<T>[]' },
      },
    },
    getRowKey: {
      description: 'Function to get unique key from each row',
      control: false,
      table: {
        type: { summary: '(row: T) => string | number' },
      },
    },
    isLoading: {
      description: 'Whether table is in loading state',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    isError: {
      description: 'Whether table is in error state',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    selectionMode: {
      description: 'Row selection mode',
      control: 'select',
      options: ['none', 'single', 'multiple'],
      table: {
        type: { summary: 'none | single | multiple' },
        defaultValue: { summary: 'none' },
      },
    },
    enableExport: {
      description: 'Enable export functionality',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable<SampleRow>>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * Default data table with sorting and basic functionality.
 */
export const Default: Story = {
  args: {
    data: smallDataset,
    columns,
    getRowKey: (row) => row.id,
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic data table with sortable columns and search functionality.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify table is rendered
    const table = canvas.getByRole('table');
    await expect(table).toBeInTheDocument();

    // Verify rows are rendered
    const rows = canvas.getAllByRole('row');
    await expect(rows.length).toBeGreaterThan(1); // Header + data rows
  },
};

// ============================================================================
// With Sorting Story
// ============================================================================

/**
 * Data table with sorting enabled and interactive sorting demo.
 */
export const WithSorting: Story = {
  render: function SortingRender() {
    const [sortBy, setSortBy] = React.useState<string>('name');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

    const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
    };

    // Sort data based on current sort state
    const sortedData = React.useMemo(() => {
      return [...sampleData].sort((a, b) => {
        const aVal = a[sortBy as keyof SampleRow];
        const bVal = b[sortBy as keyof SampleRow];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if ((aVal as any) < (bVal as any)) return sortOrder === 'asc' ? -1 : 1;
        if ((aVal as any) > (bVal as any)) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }).slice(0, 10);
    }, [sortBy, sortOrder]);

    return (
      <div>
        <div className="mb-4 text-sm text-muted-foreground">
          Sorted by: <span className="font-medium">{sortBy}</span> ({sortOrder})
        </div>
        <DataTable
          data={sortedData}
          columns={columns}
          getRowKey={(row) => row.id}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          enableExport={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates controlled sorting. Click column headers to change sort order.',
      },
    },
  },
};

// ============================================================================
// With Filtering Story
// ============================================================================

/**
 * Data table with global and column filtering.
 */
export const WithFiltering: Story = {
  render: function FilteringRender() {
    const [globalFilter, setGlobalFilter] = React.useState('');

    return (
      <div>
        <div className="mb-4 text-sm text-muted-foreground">
          Use the search box and column filter icons to filter data.
        </div>
        <DataTable
          data={sampleData.slice(0, 20)}
          columns={columns}
          getRowKey={(row) => row.id}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates global search and column-specific filters. Click the filter icon on column headers for column filters.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and use global search
    const searchInput = canvas.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'active');

    // Wait for filtering
    await new Promise((resolve) => setTimeout(resolve, 500));
  },
};

// ============================================================================
// With Pagination Story
// ============================================================================

/**
 * Data table with pagination controls.
 */
export const WithPagination: Story = {
  render: function PaginationRender() {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    const total = sampleData.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = sampleData.slice(startIndex, startIndex + pageSize);

    return (
      <DataTable
        data={paginatedData}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (newSize) => {
            setPageSize(newSize);
            setPage(1); // Reset to first page when changing size
          },
          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates pagination with configurable page sizes. Navigate between pages using the controls at the bottom.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click next page button
    const nextButton = canvas.getByLabelText('Next page');
    await userEvent.click(nextButton);
  },
};

// ============================================================================
// With Selection Story
// ============================================================================

/**
 * Data table with row selection.
 */
export const WithSelection: Story = {
  render: function SelectionRender() {
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string | number>>(new Set());

    return (
      <div>
        <div className="mb-4 text-sm text-muted-foreground">
          Selected: {selectedKeys.size} row(s)
          {selectedKeys.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setSelectedKeys(new Set())}
            >
              Clear selection
            </Button>
          )}
        </div>
        <DataTable
          data={sampleData.slice(0, 10)}
          columns={columns}
          getRowKey={(row) => row.id}
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          enableExport={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates multiple row selection with checkboxes. Use the header checkbox to select/deselect all.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Select first row
    const checkboxes = canvas.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await userEvent.click(checkboxes[1]); // First data row checkbox
    }
  },
};

// ============================================================================
// Empty State Story
// ============================================================================

/**
 * Data table with no data (empty state).
 */
export const Empty: Story = {
  args: {
    data: [],
    columns,
    getRowKey: (row) => row.id,
    emptyTitle: 'No users found',
    emptyDescription: 'Try adjusting your search or filter criteria.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the empty state when no data matches the criteria.',
      },
    },
  },
};

// ============================================================================
// Loading State Story
// ============================================================================

/**
 * Data table in loading state.
 */
export const Loading: Story = {
  args: {
    data: [],
    columns,
    getRowKey: (row) => row.id,
    isLoading: true,
    loadingRowCount: 5,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading skeleton state while data is being fetched.',
      },
    },
  },
};

// ============================================================================
// Error State Story
// ============================================================================

/**
 * Data table in error state.
 */
export const ErrorState: Story = {
  render: function ErrorRender() {
    const [isError, setIsError] = React.useState(true);

    const handleRetry = () => {
      setIsError(false);
      setTimeout(() => setIsError(true), 1000);
    };

    return (
      <DataTable
        data={[]}
        columns={columns}
        getRowKey={(row) => row.id}
        isError={isError}
        errorMessage="Failed to load user data. Please try again."
        onRetry={handleRetry}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the error state with a retry button.',
      },
    },
  },
};

// ============================================================================
// With Row Expansion Story
// ============================================================================

/**
 * Data table with expandable rows.
 */
export const WithRowExpansion: Story = {
  render: function ExpansionRender() {
    const [expandedKeys, setExpandedKeys] = React.useState<Set<string | number>>(new Set());

    return (
      <DataTable
        data={sampleData.slice(0, 10)}
        columns={columns}
        getRowKey={(row) => row.id}
        expandedKeys={expandedKeys}
        onExpansionChange={setExpandedKeys}
        renderExpandedRow={(row) => (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <h4 className="font-medium text-sm mb-2">User Details</h4>
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt className="text-muted-foreground">ID:</dt>
                <dd>{row.id}</dd>
                <dt className="text-muted-foreground">Full Name:</dt>
                <dd>{row.name}</dd>
                <dt className="text-muted-foreground">Email:</dt>
                <dd>{row.email}</dd>
                <dt className="text-muted-foreground">Score:</dt>
                <dd>{row.score.toFixed(1)}</dd>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Actions</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
        enableExport={false}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates expandable rows. Click the chevron icon to expand and see additional details.',
      },
    },
  },
};

// ============================================================================
// With Actions Column Story
// ============================================================================

/**
 * Data table with action buttons in each row.
 */
export const WithActionsColumn: Story = {
  render: function ActionsRender() {
    const columnsWithActions: DataTableColumnDef<SampleRow>[] = [
      ...columns.slice(0, 3),
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'center',
        width: 100,
        cell: (_, row) => (
          <div className="flex justify-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => alert(`Edit ${row.name}`)}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit {row.name}</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => alert(`Delete ${row.name}`)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete {row.name}</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions for {row.name}</span>
            </Button>
          </div>
        ),
      },
    ];

    return (
      <DataTable
        data={sampleData.slice(0, 10)}
        columns={columnsWithActions}
        getRowKey={(row) => row.id}
        enableExport={false}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a data table with action buttons in each row for edit, delete, and more options.',
      },
    },
  },
};

// ============================================================================
// Row Click Handler Story
// ============================================================================

/**
 * Data table with row click handling.
 */
export const WithRowClick: Story = {
  render: function RowClickRender() {
    const [selectedRow, setSelectedRow] = React.useState<SampleRow | null>(null);

    return (
      <div>
        {selectedRow && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Selected User</h4>
            <p className="text-sm text-muted-foreground">
              {selectedRow.name} ({selectedRow.email}) - {selectedRow.department}
            </p>
          </div>
        )}
        <DataTable
          data={sampleData.slice(0, 10)}
          columns={columns.slice(0, 4)}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setSelectedRow(row)}
          enableExport={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates row click handling. Click any row to see its details above the table.',
      },
    },
  },
};

// ============================================================================
// Full Featured Story
// ============================================================================

/**
 * Full-featured data table with all options enabled.
 */
export const FullFeatured: Story = {
  render: function FullFeaturedRender() {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);
    const [sortBy, setSortBy] = React.useState<string>('name');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string | number>>(new Set());
    const [expandedKeys, setExpandedKeys] = React.useState<Set<string | number>>(new Set());

    const total = sampleData.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = sampleData.slice(startIndex, startIndex + pageSize);

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Users ({total} total)</h2>
          <div className="text-sm text-muted-foreground">
            {selectedKeys.size > 0 && `${selectedKeys.size} selected`}
          </div>
        </div>
        <DataTable
          data={paginatedData}
          columns={columns}
          getRowKey={(row) => row.id}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
          }}
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          expandedKeys={expandedKeys}
          onExpansionChange={setExpandedKeys}
          renderExpandedRow={(row) => (
            <div className="text-sm">
              <strong>Additional Info:</strong> {row.name} from {row.department} has a score of {row.score.toFixed(1)}
            </div>
          )}
          enableExport
          exportFilename="users-export"
          columnVisibilityStorageKey="users-table"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A fully-featured data table with sorting, filtering, pagination, selection, expansion, and export capabilities.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Data table with accessibility features demonstrated.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The DataTable component is fully accessible with:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>Proper table semantics with th/td elements</li>
        <li>Sort direction indicated via aria-sort</li>
        <li>Keyboard navigation support</li>
        <li>Screen reader announcements for state changes</li>
        <li>Focus management for interactive elements</li>
      </ul>
      <DataTable
        data={sampleData.slice(0, 5)}
        columns={columns.slice(0, 4)}
        getRowKey={(row) => row.id}
        data-testid="accessible-table"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the accessibility features of the DataTable component.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'table', enabled: true },
          { id: 'th-has-data-cells', enabled: true },
        ],
      },
    },
  },
};
