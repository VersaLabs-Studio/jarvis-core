// D-P2-1: Uses shared keys factory from @jarvis/shared — zero inline tuples

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, type ListOpts, type CrudEntityKey } from '@jarvis/shared';
import { api } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Notify helper — native Alert + Haptics
// Toast library deferred to D6 (per D2 scope)
// ---------------------------------------------------------------------------

const notify = {
  success(_msg: string): void {
    // Success is silent on mobile — just haptic feedback
    haptics.success();
  },
  error(msg: string): void {
    haptics.error();
    Alert.alert('Error', msg);
  },
};

// ---------------------------------------------------------------------------
// Cache invalidation helper
// ---------------------------------------------------------------------------

function useInvalidate(entity: CrudEntityKey) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys[entity].all() });
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useList<T>(entity: CrudEntityKey, opts?: ListOpts) {
  return useQuery({
    queryKey: keys[entity].list(opts),
    queryFn: () => api.list<T>(entity, opts),
  });
}

export function useDoc<T>(entity: CrudEntityKey, id: string) {
  return useQuery({
    queryKey: keys[entity].doc(id),
    queryFn: () => api.get<T>(entity, id),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreate<T>(entity: CrudEntityKey) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: (body: unknown) => api.create<T>(entity, body),
    onSuccess: () => {
      invalidate();
      notify.success('Created');
    },
    onError: (e: Error) => notify.error(e.message ?? 'Create failed'),
  });
}

export function useUpdate<T>(entity: CrudEntityKey) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.update<T>(entity, id, body),
    onSuccess: () => {
      invalidate();
      notify.success('Saved');
    },
    onError: (e: Error) => notify.error(e.message ?? 'Update failed'),
  });
}

export function useDelete(entity: CrudEntityKey) {
  const invalidate = useInvalidate(entity);

  return useMutation({
    mutationFn: (id: string) => api.remove(entity, id),
    onSuccess: () => {
      invalidate();
      notify.success('Deleted');
    },
    onError: (e: Error) => notify.error(e.message ?? 'Delete failed'),
  });
}
