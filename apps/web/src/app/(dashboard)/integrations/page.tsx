"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useList, useCreate } from "@/hooks/use-entity";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Integration, IntegrationInsertData } from "@jarvis/shared";
import { integrationInsertSchema } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Skeleton,
  SkeletonCard,
  EmptyState,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const statusVariant: Record<string, "success" | "warning" | "error" | "info" | "secondary"> = {
  connected: "success",
  pending: "warning",
  disconnected: "secondary",
  error: "error",
};

const statusIcon: Record<string, React.ReactNode> = {
  connected: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  pending: (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  disconnected: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  ),
};

const providerIcons: Record<string, React.ReactNode> = {
  slack: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  ),
  github: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  jira: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.214h2.13v2.057A5.218 5.218 0 0 0 12.576 24V12.576a.99.99 0 0 0-.096-.463h-.909zm5.715-5.755H5.715a5.218 5.218 0 0 0 5.232 5.214h2.13v2.057a5.218 5.218 0 0 0 5.232 5.214V6.258a.99.99 0 0 0-.096-.463h-.909zM24 0H12.429a.99.99 0 0 0-.096.463v11.05h1.571a5.218 5.218 0 0 0 5.232-5.214V4.242h2.13A5.218 5.218 0 0 0 24 .029V0z" />
    </svg>
  ),
  default: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      />
    </svg>
  ),
};

export default function IntegrationsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const integrations = useList<Integration>("integrations");

  const testMutation = useMutation({
    mutationFn: (integrationId: string) =>
      api.post(`/api/integrations/${integrationId}/test`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration test successful");
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Integration test failed");
    },
  });

  if (integrations.isLoading) {
    return <IntegrationsSkeleton />;
  }

  if (integrations.isError) {
    return (
      <ErrorState
        title="Failed to load integrations"
        description={
          integrations.error?.message ?? "An error occurred while loading integrations."
        }
        onRetry={() => integrations.refetch()}
      />
    );
  }

  const integrationList = integrations.data?.data ?? [];

  return (
    <DataView className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect and manage your third-party services
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Integration
            </Button>
          </DialogTrigger>
          <AddIntegrationDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {integrationList.length === 0 ? (
        <EmptyState
          title="No integrations configured"
          description="Add your first integration to connect external services."
          action={
            <Button onClick={() => setOpen(true)}>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Integration
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {integrationList.map((integration) => (
            <motion.div key={integration.id} variants={itemVariants}>
              <IntegrationCard
                integration={integration}
                onTest={() => testMutation.mutate(integration.id)}
                isTesting={testMutation.isPending}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </DataView>
  );
}

function IntegrationCard({
  integration,
  onTest,
  isTesting,
}: {
  integration: Integration;
  onTest: () => void;
  isTesting: boolean;
}) {
  const provider = integration.provider.toLowerCase();
  const icon = providerIcons[provider] ?? providerIcons.default;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <CardDescription>{integration.provider}</CardDescription>
            </div>
          </div>
          <Badge variant={statusVariant[integration.status] ?? "secondary"}>
            <span className="flex items-center gap-1">
              {statusIcon[integration.status]}
              {integration.status}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(integration.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(integration.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {integration.config && typeof integration.config === "object" && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Configuration</p>
            <div className="rounded bg-muted px-2 py-1">
              <p className="text-xs font-mono truncate">
                {Object.keys(integration.config as Record<string, unknown>).length}{" "}
                {Object.keys(integration.config as Record<string, unknown>).length === 1
                  ? "field"
                  : "fields"}{" "}
                configured
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onTest}
            disabled={isTesting || integration.status === "pending"}
          >
            {isTesting ? (
              <svg
                className="h-3 w-3 mr-1 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
            Test
          </Button>
          <Button variant="ghost" size="sm">
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddIntegrationDialog({ onClose }: { onClose: () => void }) {
  const createIntegration = useCreate<Integration>("integrations");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(integrationInsertSchema),
    defaultValues: {
      name: "",
      provider: "",
      status: "pending" as const,
      config: {} as Record<string, unknown>,
      metadata: {} as Record<string, unknown>,
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    createIntegration.mutate(data as IntegrationInsertData, {
      onSuccess: () => {
        toast.success("Integration created");
        reset();
        onClose();
      },
      onError: (error: Error) => {
        toast.error(error.message ?? "Failed to create integration");
      },
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Integration</DialogTitle>
        <DialogDescription>
          Connect a new third-party service to your JARVIS instance.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            {...register("name")}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="My Slack Integration"
          />
          {errors.name && (
            <p className="text-xs text-error">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="provider" className="text-sm font-medium">
            Provider
          </label>
          <select
            id="provider"
            {...register("provider")}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a provider</option>
            <option value="slack">Slack</option>
            <option value="github">GitHub</option>
            <option value="jira">Jira</option>
            <option value="discord">Discord</option>
            <option value="webhook">Custom Webhook</option>
          </select>
          {errors.provider && (
            <p className="text-xs text-error">{errors.provider.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createIntegration.isPending}>
            {createIntegration.isPending ? "Creating..." : "Create Integration"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
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
