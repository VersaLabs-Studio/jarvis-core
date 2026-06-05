"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { SystemLogLevel } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLogs, useLogStream } from "./_hooks/use-logs";
import { LogViewer } from "./_components/log-viewer";
import { LevelFilters } from "./_components/level-filters";
import { ServiceFilter } from "./_components/service-filter";

const statusColor: Record<string, "success" | "warning" | "error" | "secondary"> = {
  connected: "success",
  connecting: "warning",
  disconnected: "secondary",
  error: "error",
};

export default function LogsPage() {
  const [level, setLevel] = useState<SystemLogLevel | null>(null);
  const [service, setService] = useState<string | null>(null);

  const historical = useLogs({ level, service });
  const { logs: liveLogs, status: sseStatus, clearLogs } = useLogStream({ level, service });

  const services = useMemo(() => {
    const all = [...(historical.data?.data ?? []), ...liveLogs];
    return [...new Set(all.map((l) => l.service))].sort();
  }, [historical.data, liveLogs]);

  const mergedLogs = useMemo(() => {
    const historicalLogs = historical.data?.data ?? [];
    const liveIds = new Set(liveLogs.map((l) => l.id));
    const deduped = historicalLogs.filter((l) => !liveIds.has(l.id));
    return [...liveLogs, ...deduped];
  }, [historical.data, liveLogs]);

  if (historical.isLoading) {
    return <LogsSkeleton />;
  }

  if (historical.isError) {
    return (
      <ErrorState
        title="Failed to load logs"
        description={historical.error?.message ?? "Could not load system logs."}
        onRetry={() => historical.refetch()}
      />
    );
  }

  return (
    <DataView className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system log stream
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                sseStatus === "connected"
                  ? "bg-success"
                  : sseStatus === "connecting"
                    ? "bg-warning animate-pulse"
                    : "bg-error"
              }`}
            />
            <Badge variant={statusColor[sseStatus] ?? "secondary"}>
              {sseStatus}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <LevelFilters active={level} onChange={setLevel} />
        <ServiceFilter
          services={services}
          active={service}
          onChange={setService}
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {mergedLogs.length} entries
        </span>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
          <div className="bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-error/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">
              jarvis-logs
            </span>
          </div>
          <LogViewer logs={mergedLogs} className="h-[calc(100vh-22rem)]" />
        </div>
      </motion.div>
    </DataView>
  );
}

function LogsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-16 rounded-md" />
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80">
        <div className="bg-muted/30 border-b border-border/50 px-4 py-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
