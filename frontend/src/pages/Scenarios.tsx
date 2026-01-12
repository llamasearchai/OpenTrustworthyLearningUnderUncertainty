/**
 * Scenarios Page
 *
 * List and manage evaluation scenarios with CRUD operations.
 *
 * @module pages/Scenarios
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Filter, Play, Trash2, RefreshCw, MoreHorizontal, FolderOpen } from 'lucide-react';
import { useScenarios, useRunEvaluation } from '@/hooks/useScenarios';
import { CreateScenarioModal } from '@/components/scenarios/CreateScenarioModal';
import { DeleteScenarioDialog } from '@/components/scenarios/DeleteScenarioDialog';
import { Card } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ScenarioToDelete {
  id: string;
  name: string;
}

// ============================================================================
// Component
// ============================================================================

export default function Scenarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<ScenarioToDelete | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useScenarios({ page, pageSize: 10 });
  const runEvaluation = useRunEvaluation();

  // Handle URL action param for opening create modal
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setCreateModalOpen(true);
      // Remove action from URL
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredScenarios = data?.items.filter((scenario) =>
    scenario.id.toLowerCase().includes(search.toLowerCase()) ||
    Object.values(scenario.tags).some((tag) =>
      tag.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success('Scenarios refreshed');
  };

  const handleRunEvaluation = async (scenarioId: string) => {
    try {
      toast.info('Starting evaluation...', {
        description: `Running evaluation for scenario ${scenarioId}`,
      });
      await runEvaluation.mutateAsync({ scenarioId });
      toast.success('Evaluation complete', {
        description: 'Results are now available.',
      });
    } catch (error) {
      toast.error('Evaluation failed', {
        description: 'An error occurred during evaluation.',
      });
    }
  };

  const handleCreateSuccess = (scenarioId: string) => {
    // Navigate to the new scenario
    navigate(`/scenarios/${scenarioId}`);
  };

  const handleDeleteSuccess = () => {
    setScenarioToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage and evaluate test scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} data-testid="create-scenario-button">
            <Plus className="mr-2 h-4 w-4" />
            Create Scenario
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Scenarios List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))
        ) : error ? (
          <Card className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4">
                Error loading scenarios: {error.message}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : filteredScenarios?.length === 0 ? (
          <EmptyState
            onCreateClick={() => setCreateModalOpen(true)}
            hasSearch={!!search}
          />
        ) : (
          filteredScenarios?.map((scenario) => (
            <Card key={scenario.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <Link
                    to={`/scenarios/${scenario.id}`}
                    className="text-lg font-medium hover:underline hover:text-primary block truncate"
                  >
                    {scenario.id}
                  </Link>
                  {Object.keys(scenario.tags).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(scenario.tags).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunEvaluation(scenario.id)}
                    disabled={runEvaluation.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {runEvaluation.isPending ? 'Running...' : 'Evaluate'}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/scenarios/${scenario.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/viewer/${scenario.id}`}>
                          Open in 3D Viewer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setScenarioToDelete({ id: scenario.id, name: scenario.id })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 10 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.total)} of{' '}
            {data.total} scenarios
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.has_more}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateScenarioModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />

      <DeleteScenarioDialog
        open={!!scenarioToDelete}
        onOpenChange={(open) => !open && setScenarioToDelete(null)}
        scenario={scenarioToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  onCreateClick,
  hasSearch,
}: {
  onCreateClick: () => void;
  hasSearch: boolean;
}) {
  if (hasSearch) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No matching scenarios</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-12">
      <div className="text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No scenarios yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first evaluation scenario to get started.
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create Scenario
        </Button>
      </div>
    </Card>
  );
}
