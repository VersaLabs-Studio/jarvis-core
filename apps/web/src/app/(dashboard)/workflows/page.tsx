"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Workflow, WorkflowStatus } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  SkeletonCard,
  EmptyState,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useTriggerWorkflow,
} from "./_hooks/use-workflows";
import { WorkflowForm } from "./_components/workflow-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusVariant: Record<WorkflowStatus, "success" | "warning" | "error" | "info" | "secondary"> = {
  active: "success",
  paused: "warning",
  draft: "secondary",
  archived: "secondary",
};

export default function WorkflowsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const workflows = useWorkflows();
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();
  const triggerMutation = useTriggerWorkflow();

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditing(workflow);
    setFormOpen(true);
  };

  const handleSubmit = (data: { name: string; description?: string }) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: data },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this workflow?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTrigger = (id: string) => {
    triggerMutation.mutate(id);
  };

  if (workflows.isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (workflows.isError) {
    return (
      <ErrorState
        title="Failed to load workflows"
        description={workflows.error?.message ?? "Could not load workflows."}
        onRetry={() => workflows.refetch()}
      />
    );
  }

  const workflowList = workflows.data?.data ?? [];

  return (
    <DataView className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage and trigger your automation workflows
          </p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Workflow
        </Button>
      </motion.div>

      {workflowList.length === 0 ? (
        <EmptyState
          title="No workflows"
          description="Create your first workflow to get started with automation."
          action={
            <Button onClick={handleCreate}>New Workflow</Button>
          }
        />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {workflowList.map((workflow) => (
            <motion.div key={workflow.id} variants={itemVariants}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <Badge variant={statusVariant[workflow.status] ?? "secondary"}>
                      {workflow.status}
                    </Badge>
                  </div>
                  {workflow.description && (
                    <CardDescription className="line-clamp-2">
                      {workflow.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Version</p>
                      <p className="font-medium">v{workflow.version}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTrigger(workflow.id)}
                      disabled={workflow.status !== "active"}
                    >
                      <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(workflow)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-error hover:text-error"
                      onClick={() => handleDelete(workflow.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Workflow" : "New Workflow"}</DialogTitle>
          </DialogHeader>
          <WorkflowForm
            defaultValues={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DataView>
  );
}

function WorkflowsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
