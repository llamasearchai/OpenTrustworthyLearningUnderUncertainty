/**
 * CreateScenarioModal Component
 *
 * Modal dialog for creating new evaluation scenarios.
 *
 * @module components/scenarios/CreateScenarioModal
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Tag } from 'lucide-react';
import { useCreateScenario } from '@/hooks/useScenarios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Schema
// ============================================================================

const createScenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

type CreateScenarioFormData = z.infer<typeof createScenarioSchema>;

// ============================================================================
// Types
// ============================================================================

interface CreateScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scenarioId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CreateScenarioModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateScenarioModalProps) {
  const [tags, setTags] = useState<Record<string, string>>({});
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');

  const createScenario = useCreateScenario();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateScenarioFormData>({
    resolver: zodResolver(createScenarioSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleClose = () => {
    reset();
    setTags({});
    setTagKey('');
    setTagValue('');
    onOpenChange(false);
  };

  const handleAddTag = () => {
    if (tagKey.trim() && tagValue.trim()) {
      setTags((prev) => ({ ...prev, [tagKey.trim()]: tagValue.trim() }));
      setTagKey('');
      setTagValue('');
    }
  };

  const handleRemoveTag = (key: string) => {
    setTags((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (formData: CreateScenarioFormData) => {
    try {
      const result = await createScenario.mutateAsync({
        tags,
        data: {
          name: formData.name,
          description: formData.description || '',
        },
      });

      toast.success('Scenario created', {
        description: `"${formData.name}" has been created successfully.`,
      });

      handleClose();
      onSuccess?.(result.id);
    } catch (error) {
      toast.error('Failed to create scenario', {
        description: 'An error occurred. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            Define a new evaluation scenario for testing your model.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Night Driving Scenario"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the scenario..."
              rows={3}
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Key"
                value={tagKey}
                onChange={(e) => setTagKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!tagKey.trim() || !tagValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Object.keys(tags).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(tags).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {key}: {value}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(key)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createScenario.isPending}>
              {isSubmitting || createScenario.isPending ? 'Creating...' : 'Create Scenario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateScenarioModal;
