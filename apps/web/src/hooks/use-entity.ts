// D-P2-1: Uses shared keys factory from @jarvis/shared — closes PC-DRY-1
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keys, type ListOpts } from "@jarvis/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

function useInvalidate(entity: keyof typeof keys) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys[entity].all() });
}

export function useList<T>(entity: keyof typeof keys, opts?: ListOpts) {
  return useQuery({
    queryKey: keys[entity].list(opts),
    queryFn: () => api.list<T>(entity, opts),
  });
}

export function useDoc<T>(entity: keyof typeof keys, id: string) {
  return useQuery({
    queryKey: keys[entity].doc(id),
    queryFn: () => api.get<T>(entity, id),
    enabled: !!id,
  });
}

export function useCreate<T>(entity: keyof typeof keys) {
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

export function useUpdate<T>(entity: keyof typeof keys) {
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

export function useDelete(entity: keyof typeof keys) {
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
