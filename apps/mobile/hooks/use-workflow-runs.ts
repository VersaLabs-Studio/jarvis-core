import { useQuery } from '@tanstack/react-query';
import { keys } from '@jarvis/shared';
import type { WorkflowRun } from '@jarvis/shared';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Workflow Runs — bespoke hook (NOT routed through /api/cms/)
// ---------------------------------------------------------------------------

export function useWorkflowRuns(workflowId: string | null) {
  return useQuery({
    queryKey: [...keys.workflow_runs.all(), workflowId],
    queryFn: () =>
      api.getRaw<{ data: WorkflowRun[] }>(
        `/api/workflows/${workflowId}/runs`,
      ),
    enabled: !!workflowId,
  });
}
