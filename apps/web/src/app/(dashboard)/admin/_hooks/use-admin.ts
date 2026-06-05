"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminOverview } from "@jarvis/shared";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.getRaw<{ data: AdminOverview }>("/api/admin/overview"),
  });
}
