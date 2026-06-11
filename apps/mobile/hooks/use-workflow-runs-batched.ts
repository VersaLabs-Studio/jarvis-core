// D6 §6 carryover: replaces per-card useWorkflowRuns with a single batched query.
// One fetch for all visible workflow ids; each card reads its slice from the result.

import { useQuery } from '@tanstack/react-query';
import { keys } from '@jarvis/shared';
import type { WorkflowRun } from '@jarvis/shared';
import { api } from '@/lib/api';

export function useWorkflowRunsBatched(workflowIds: string[]) {
  return useQuery({
    queryKey: [...keys.workflow_runs.all(), 'batched', [...workflowIds].sort()],
    queryFn: async () => {
      const settled = await Promise.allSettled(
        workflowIds.map((id) =>
          api
            .getRaw<{ data: WorkflowRun[] }>(`/api/workflows/${id}/runs`)
            .then((r) => ({ id, runs: r.data })),
        ),
      );
      const out: Record<string, WorkflowRun[]> = {};
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          out[r.value.id] = r.value.runs;
        }
      }
      return out;
    },
    enabled: workflowIds.length > 0,
  });
}
