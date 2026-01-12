/**
 * Scenario Detail Page
 *
 * View and manage a single scenario with evaluation results.
 *
 * @module pages/ScenarioDetail
 */

import { useParams, Link } from 'react-router-dom';
import { useScenario, useEvaluationResults, useRunEvaluation } from '@/hooks/useEvaluation';
import { Card } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: scenario, isLoading: scenarioLoading } = useScenario(id || '');
  const { data: results, isLoading: resultsLoading } = useEvaluationResults(id || '');
  const { mutate: runEvaluation, isPending: isEvaluating } = useRunEvaluation();

  if (scenarioLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Scenario not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/scenarios" className="hover:underline">
              Scenarios
            </Link>
            <span>/</span>
            <span>{scenario.id}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{scenario.id}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              runEvaluation({
                scenarioId: scenario.id,
                metrics: ['accuracy', 'safety', 'uncertainty'],
              })
            }
            disabled={isEvaluating}
          >
            {isEvaluating ? 'Running...' : 'Run Evaluation'}
          </Button>
          <Button variant="outline">Edit Scenario</Button>
        </div>
      </div>

      {/* Scenario Info */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Scenario Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">ID</p>
            <p className="font-medium">{scenario.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(scenario.tags).map(([key, value]) => (
                <Badge key={key} variant="secondary">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Evaluation Results */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Evaluation Results</h2>
        {resultsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : results?.items.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No evaluation results yet. Run an evaluation to see results.
          </p>
        ) : (
          <div className="space-y-4">
            {results?.items.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.passed ? 'default' : 'destructive'}>
                      {result.passed ? 'Passed' : 'Failed'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Scenario: {result.scenario_id}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    {Object.entries(result.metrics).map(([key, value]) => (
                      <span key={key} className="text-sm">
                        {key}: <span className="font-medium">{value.toFixed(3)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
