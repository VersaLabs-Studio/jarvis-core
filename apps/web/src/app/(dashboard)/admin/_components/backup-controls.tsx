"use client";

import type { BackupStatus } from "@jarvis/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BackupControlsProps {
  backup: BackupStatus;
  onBackup?: () => void;
}

export function BackupControls({ backup, onBackup }: BackupControlsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Backups</CardTitle>
          <Button variant="outline" size="sm" onClick={onBackup}>
            Backup Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
            <Badge
              variant={
                backup.status === "completed" ? "success" :
                backup.status === "running" ? "warning" :
                backup.status === "failed" ? "error" :
                "secondary"
              }
              className="mt-1"
            >
              {backup.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Backup</p>
            <p className="text-sm font-medium mt-1">
              {backup.lastBackup
                ? new Date(backup.lastBackup).toLocaleString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Schedule</p>
            <p className="text-sm font-medium mt-1">{backup.schedule}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Retention</p>
            <p className="text-sm font-medium mt-1">{backup.retention} days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
