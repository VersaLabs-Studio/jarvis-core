"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ConfigData, EnvVar } from "@jarvis/shared";

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.getRaw<{ data: ConfigData }>("/api/config"),
  });
}

export function useUpdateEnvVar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.post("/api/config/env", { key, value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
      toast.success("Environment variable updated");
    },
    onError: (e: Error) => toast.error(e.message ?? "Update failed"),
  });
}

export function useRestartService() {
  return useMutation({
    mutationFn: (service: string) => api.post(`/api/config/restart/${service}`),
    onSuccess: () => toast.success("Service restart initiated"),
    onError: (e: Error) => toast.error(e.message ?? "Restart failed"),
  });
}
