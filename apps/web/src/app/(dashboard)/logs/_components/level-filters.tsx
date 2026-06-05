"use client";

import { cn } from "@/lib/cn";
import type { SystemLogLevel } from "@jarvis/shared";

const levels: Array<{ value: SystemLogLevel | null; label: string; color: string }> = [
  { value: null, label: "All", color: "bg-muted text-foreground" },
  { value: "info", label: "Info", color: "bg-info/10 text-info" },
  { value: "warn", label: "Warn", color: "bg-warning/10 text-warning" },
  { value: "error", label: "Error", color: "bg-error/10 text-error" },
  { value: "debug", label: "Debug", color: "bg-muted text-muted-foreground" },
];

interface LevelFiltersProps {
  active: SystemLogLevel | null;
  onChange: (level: SystemLogLevel | null) => void;
  className?: string;
}

export function LevelFilters({ active, onChange, className }: LevelFiltersProps) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {levels.map((level) => (
        <button
          key={level.label}
          onClick={() => onChange(level.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
            active === level.value
              ? cn(level.color, "ring-1 ring-ring")
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
