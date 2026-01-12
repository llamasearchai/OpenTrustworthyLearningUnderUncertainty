/**
 * Active Learning Page
 *
 * Manage data acquisition and batch selection for active learning.
 *
 * @module pages/ActiveLearning
 */

import { useState } from 'react';
import { useSamples, useBatchSelection, useAcquisitionConfig } from '@/hooks/useActiveLearning';
import { Card } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActiveLearning() {
  const [batchSize, setBatchSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: samples, isLoading: samplesLoading } = useSamples();
  const { data: config } = useAcquisitionConfig();
  const { mutate: selectBatch, isPending: isSelecting } = useBatchSelection();

  const handleSelectBatch = () => {
    if (samples?.items) {
      selectBatch({
        sampleIds: samples.items.map((s) => s.id),
        batchSize,
        config,
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Learning</h1>
          <p className="text-muted-foreground">
            Intelligent data acquisition and batch selection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Configure Acquisition</Button>
          <Button onClick={handleSelectBatch} disabled={isSelecting}>
            {isSelecting ? 'Selecting...' : 'Select Batch'}
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Batch Size</p>
          <Input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
            min={1}
            max={100}
            className="mt-2"
          />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Uncertainty Weight</p>
          <p className="mt-2 text-2xl font-bold">{config?.weight_uncertainty || 1.0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Risk Weight</p>
          <p className="mt-2 text-2xl font-bold">{config?.weight_risk || 2.0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Novelty Weight</p>
          <p className="mt-2 text-2xl font-bold">{config?.weight_novelty || 0.5}</p>
        </Card>
      </div>

      {/* Samples List */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sample Pool</h2>
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} selected of {samples?.total || 0} samples
          </p>
        </div>
        {samplesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : samples?.items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No samples available
          </p>
        ) : (
          <div className="space-y-3">
            {samples?.items.map((sample) => (
              <div
                key={sample.id}
                className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedIds.has(sample.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleSelection(sample.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(sample.id)}
                  onChange={() => toggleSelection(sample.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sample.id}</span>
                    <Badge variant="outline">
                      Novelty: {sample.novelty_score.toFixed(3)}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      Confidence: {sample.uncertainty.confidence.toFixed(3)}
                    </span>
                    <span>
                      Aleatoric: {sample.uncertainty.aleatoric_score.toFixed(3)}
                    </span>
                    <span>
                      Epistemic: {sample.uncertainty.epistemic_score.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Risk</p>
                  <p className="font-semibold">
                    {sample.risk.expected_risk.toFixed(3)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
