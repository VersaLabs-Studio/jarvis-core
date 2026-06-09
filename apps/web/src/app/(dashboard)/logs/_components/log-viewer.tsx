"use client";

import { cn } from "@/lib/cn";
import type { SystemLog, SystemLogLevel } from "@jarvis/shared";

const levelConfig: Record<SystemLogLevel, { color: string; bg: string; label: string }> = {
  info: { color: "text-info", bg: "bg-info/10", label: "INFO" },
  warn: { color: "text-warning", bg: "bg-warning/10", label: "WARN" },
  error: { color: "text-error", bg: "bg-error/10", label: "ERR " },
  debug: { color: "text-muted-foreground", bg: "bg-muted", label: "DBG " },
};

interface LogViewerProps {
  logs: SystemLog[];
  className?: string;
}

export function LogViewer({ logs, className }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-16 text-muted-foreground text-sm font-mono", className)}>
        Waiting for logs...
      </div>
    );
  }

  return (
    <div className={cn("overflow-auto font-mono text-xs leading-relaxed", className)}>
      {logs.map((log) => {
        const cfg = levelConfig[log.level];
        const time = new Date(log.created_at).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 px-4 py-1 hover:bg-muted/50 transition-colors border-b border-border/20"
          >
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {time}
            </span>
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            <span className="text-muted-foreground shrink-0 w-24 truncate">
              [{log.service}]
            </span>
            <span className="text-foreground break-all">
              {log.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
