"use client";

import { cn } from "@/lib/cn";

interface ServiceFilterProps {
  services: string[];
  active: string | null;
  onChange: (service: string | null) => void;
  className?: string;
}

export function ServiceFilter({ services, active, onChange, className }: ServiceFilterProps) {
  return (
    <select
      value={active ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "text-foreground",
        className,
      )}
    >
      <option value="">All Services</option>
      {services.map((svc) => (
        <option key={svc} value={svc}>
          {svc}
        </option>
      ))}
    </select>
  );
}
