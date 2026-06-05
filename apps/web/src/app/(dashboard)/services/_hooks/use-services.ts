"use client";

import { useList, useCreate, useUpdate, useDelete } from "@/hooks/use-entity";
import type { Service } from "@jarvis/shared";

export function useServices() {
  return useList<Service>("services");
}

export function useCreateService() {
  return useCreate<Service>("services");
}

export function useUpdateService() {
  return useUpdate<Service>("services");
}

export function useDeleteService() {
  return useDelete("services");
}
