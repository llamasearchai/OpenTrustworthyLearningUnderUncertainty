/**
 * DeleteScenarioDialog Component
 *
 * Confirmation dialog for deleting evaluation scenarios.
 *
 * @module components/scenarios/DeleteScenarioDialog
 */

import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { useDeleteScenario } from '@/hooks/useScenarios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================================
// Types
// ============================================================================

interface DeleteScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: {
    id: string;
    name: string;
  } | null;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DeleteScenarioDialog({
  open,
  onOpenChange,
  scenario,
  onSuccess,
}: DeleteScenarioDialogProps) {
  const deleteScenario = useDeleteScenario();

  const handleDelete = async () => {
    if (!scenario) return;

    try {
      await deleteScenario.mutateAsync(scenario.id);

      toast.success('Scenario deleted', {
        description: `"${scenario.name}" has been deleted.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to delete scenario', {
        description: 'An error occurred. Please try again.',
      });
    }
  };

  if (!scenario) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to delete <strong>"{scenario.name}"</strong>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={deleteScenario.isPending}
          >
            {deleteScenario.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteScenarioDialog;
