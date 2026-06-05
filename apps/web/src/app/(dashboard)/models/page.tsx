"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ModelsResponse, ModelInfo, OpenRouterStatus, RoutingConfig, ModelUsageStats } from "@jarvis/shared";
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
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/cn";

function useModelsData() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => api.getRaw<ModelsResponse>("/api/models"),
  });
}

const statusVariant: Record<string, "success" | "warning" | "error" | "info" | "secondary"> = {
  available: "success",
  limited: "warning",
  unavailable: "error",
};

const strategyLabels: Record<string, string> = {
  cost: "Cost Optimized",
  quality: "Quality First",
  balanced: "Balanced",
};

export default function ModelsPage() {
  const { data, isLoading, isError, refetch } = useModelsData();

  if (isLoading) {
    return <ModelsSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load models"
        description="An error occurred while loading model configuration."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No model data"
        description="Model configuration is not available."
      />
    );
  }

  const { openRouter, routing, models, usage } = data;

  return (
    <DataView className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI model routing and monitor OpenRouter status
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* OpenRouter Status Card */}
      <motion.div variants={itemVariants}>
        <OpenRouterStatusCard status={openRouter} />
      </motion.div>

      {/* Routing Config */}
      <motion.div variants={itemVariants}>
        <RoutingConfigCard config={routing} />
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Models"
          value={models.length}
          icon={
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
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          }
        />
        <StatCard
          label="Available"
          value={models.filter((m) => m.status === "available").length}
          icon={
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Requests"
          value={usage.reduce((sum, u) => sum + u.totalRequests, 0).toLocaleString()}
          icon={
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
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          }
        />
        <StatCard
          label="Credits Remaining"
          value={`$${openRouter.creditsRemaining.toFixed(2)}`}
          icon={
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
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          }
        />
      </motion.div>

      {/* Model Cards */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-4">Available Models</h2>
      </motion.div>

      {models.length === 0 ? (
        <EmptyState
          title="No models configured"
          description="Configure your first AI model to get started."
          action={<Button>Add Model</Button>}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {models.map((model) => {
            const modelUsage = usage.find((u) => u.modelId === model.id);
            return (
              <motion.div key={model.id} variants={itemVariants}>
                <ModelCard model={model} usage={modelUsage} />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </DataView>
  );
}

function OpenRouterStatusCard({ status }: { status: OpenRouterStatus }) {
  const creditPercentage = status.creditsTotal > 0
    ? (status.creditsRemaining / status.creditsTotal) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>OpenRouter Status</CardTitle>
            <CardDescription>API connection and credit balance</CardDescription>
          </div>
          <Badge variant={status.connected ? "success" : "error"}>
            {status.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">API Key</p>
            <p className="text-sm font-medium mt-1">
              {status.apiKeyValid ? (
                <span className="text-success">Valid</span>
              ) : (
                <span className="text-error">Invalid</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credits</p>
            <p className="text-sm font-medium mt-1">
              ${status.creditsRemaining.toFixed(2)} / ${status.creditsTotal.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rate Limit</p>
            <p className="text-sm font-medium mt-1">
              {status.rateLimit.currentUsage} / {status.rateLimit.requestsPerMinute} req/min
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Checked</p>
            <p className="text-sm font-medium mt-1">
              {new Date(status.lastChecked).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Credit Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Credit Usage</span>
            <span>{creditPercentage.toFixed(1)}% remaining</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                creditPercentage > 50
                  ? "bg-success"
                  : creditPercentage > 20
                    ? "bg-warning"
                    : "bg-error",
              )}
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoutingConfigCard({ config }: { config: RoutingConfig }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Routing Configuration</CardTitle>
        <CardDescription>Model routing and fallback settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Default Model</p>
            <p className="text-sm font-medium mt-1 font-mono">{config.defaultModel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fallback Model</p>
            <p className="text-sm font-medium mt-1 font-mono">{config.fallbackModel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Strategy</p>
            <Badge variant="info" className="mt-1">
              {strategyLabels[config.routingStrategy] ?? config.routingStrategy}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Auto Fallback</p>
            <p className="text-sm font-medium mt-1">
              {config.autoFallback ? (
                <span className="text-success">Enabled</span>
              ) : (
                <span className="text-muted-foreground">Disabled</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Retries</p>
            <p className="text-sm font-medium mt-1">{config.maxRetries}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Timeout</p>
            <p className="text-sm font-medium mt-1">{config.timeout}ms</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ModelCard({ model, usage }: { model: ModelInfo; usage?: ModelUsageStats }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{model.name}</CardTitle>
          <Badge variant={statusVariant[model.status] ?? "secondary"}>
            {model.status}
          </Badge>
        </div>
        <CardDescription>{model.provider}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Context</p>
            <p className="font-medium">{(model.contextWindow / 1000).toFixed(0)}K</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Output</p>
            <p className="font-medium">{(model.maxOutput / 1000).toFixed(0)}K</p>
          </div>
          <div>
            <p className="text-muted-foreground">Input Cost</p>
            <p className="font-medium">${model.pricing.input}/1M</p>
          </div>
          <div>
            <p className="text-muted-foreground">Output Cost</p>
            <p className="font-medium">${model.pricing.output}/1M</p>
          </div>
        </div>

        {model.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {model.capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-[10px]">
                {cap}
              </Badge>
            ))}
          </div>
        )}

        {usage && (
          <div className="border-t border-border/50 pt-3">
            <p className="text-xs text-muted-foreground mb-2">Usage Stats</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Requests:</span>{" "}
                <span className="font-medium">{usage.totalRequests.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tokens:</span>{" "}
                <span className="font-medium">{(usage.totalTokens / 1000).toFixed(1)}K</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Latency:</span>{" "}
                <span className="font-medium">{usage.avgLatency}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Error Rate:</span>{" "}
                <span
                  className={cn(
                    "font-medium",
                    usage.errorRate > 5 ? "text-error" : "text-success",
                  )}
                >
                  {usage.errorRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModelsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
