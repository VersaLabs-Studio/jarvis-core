"use client";

import { useState } from "react";
import type { Workflow } from "@jarvis/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkflowFormProps {
  defaultValues?: Partial<Workflow>;
  onSubmit: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
}

export function WorkflowForm({ defaultValues, onSubmit, onCancel }: WorkflowFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-workflow"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
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
