"use client";

import { useList, useCreate, useUpdate, useDelete } from "@/hooks/use-entity";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@jarvis/shared";
import { toast } from "sonner";
import type { Workflow, WorkflowRun } from "@jarvis/shared";

export function useWorkflows() {
  return useList<Workflow>("workflows");
}

export function useCreateWorkflow() {
  return useCreate<Workflow>("workflows");
}

export function useUpdateWorkflow() {
  return useUpdate<Workflow>("workflows");
}

export function useDeleteWorkflow() {
  return useDelete("workflows");
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (workflowId: string) =>
      api.post<{ data: WorkflowRun }>(`/api/workflows/${workflowId}/trigger`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workflowRun.all() });
      toast.success("Workflow triggered");
    },
    onError: (e: Error) => toast.error(e.message ?? "Trigger failed"),
  });
}
