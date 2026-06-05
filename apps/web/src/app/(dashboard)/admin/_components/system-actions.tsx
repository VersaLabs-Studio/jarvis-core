"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SystemActionsProps {
  onRestart?: (service: string) => void;
}

export function SystemActions({ onRestart }: SystemActionsProps) {
  const actions = [
    { label: "Restart API", service: "api", description: "Restart the API server" },
    { label: "Restart Worker", service: "worker", description: "Restart the background worker" },
    { label: "Clear Cache", service: "cache", description: "Clear application cache" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.service}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3"
            >
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestart?.(action.service)}
              >
                Execute
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
