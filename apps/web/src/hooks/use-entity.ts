import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListOpts } from "@jarvis/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

function useInvalidate(entity: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [entity] });
}

export function useList<T>(entity: string, opts?: ListOpts) {
  return useQuery({
    queryKey: [entity, "list", opts] as const,
    queryFn: () => api.list<T>(entity, opts),
  });
}

export function useDoc<T>(entity: string, id: string) {
  return useQuery({
    queryKey: [entity, "doc", id] as const,
    queryFn: () => api.get<T>(entity, id),
    enabled: !!id,
  });
}

export function useCreate<T>(entity: string) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: (body: unknown) => api.create<T>(entity, body),
    onSuccess: () => {
      invalidate();
      toast.success("Created");
    },
    onError: (e: Error) => toast.error(e.message ?? "Create failed"),
  });
}

export function useUpdate<T>(entity: string) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.update<T>(entity, id, body),
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Update failed"),
  });
}

export function useDelete(entity: string) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: (id: string) => api.remove(entity, id),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message ?? "Delete failed"),
  });
}
