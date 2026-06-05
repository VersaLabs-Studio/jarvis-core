"use client";

import type { SystemInfo } from "@jarvis/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SystemInfoProps {
  system: SystemInfo;
}

export function SystemInfoCard({ system }: SystemInfoProps) {
  const memUsedPct = system.memory.total > 0
    ? ((system.memory.used / system.memory.total) * 100).toFixed(1)
    : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Version</p>
            <p className="text-sm font-medium mt-1 font-mono">{system.version}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Environment</p>
            <p className="text-sm font-medium mt-1">{system.environment}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Node</p>
            <p className="text-sm font-medium mt-1 font-mono">{system.nodeVersion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Platform</p>
            <p className="text-sm font-medium mt-1">{system.platform}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">CPU</p>
            <p className="text-sm font-medium mt-1">
              {system.cpu.cores} cores ({system.cpu.usage.toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Memory</p>
            <p className="text-sm font-medium mt-1">
              {memUsedPct}% used
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
