"use client";

import { cn } from "@/lib/cn";

interface EnvVarDisplayProps {
  envVars: Array<{ key: string; value: string; masked: boolean; description?: string }>;
  onUpdate: (key: string, value: string) => void;
}

export function EnvVarDisplay({ envVars, onUpdate }: EnvVarDisplayProps) {
  return (
    <div className="space-y-2">
      {envVars.map((env) => (
        <div
          key={env.key}
          className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-medium">{env.key}</p>
            {env.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{env.description}</p>
            )}
          </div>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[200px]">
            {env.masked ? "••••••••" : env.value}
          </code>
        </div>
      ))}
    </div>
  );
}
