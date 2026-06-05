"use client";

import { useState } from "react";
import type { Service } from "@jarvis/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ServiceFormProps {
  defaultValues?: Partial<Service>;
  onSubmit: (data: { name: string; type: string; config?: Record<string, unknown> }) => void;
  onCancel: () => void;
}

export function ServiceForm({ defaultValues, onSubmit, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [type, setType] = useState(defaultValues?.type ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type.trim()) return;
    onSubmit({ name: name.trim(), type: type.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-service"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="api, worker, cron..."
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {defaultValues?.id ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
