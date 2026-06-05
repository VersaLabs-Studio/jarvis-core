import type { EntityKey } from "../config/entities";

export interface ListOpts {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

const makeKeys = <K extends string>(entity: K) => ({
  all: () => [entity] as const,
  list: (opts?: ListOpts) => [entity, "list", opts] as const,
  doc: (id: string) => [entity, "doc", id] as const,
});

export const keys = {
  workflow: makeKeys("workflow"),
  integration: makeKeys("integration"),
  skill: makeKeys("skill"),
  service: makeKeys("service"),
  secret: makeKeys("secret"),
  chatSession: makeKeys("chat_session"),
  chatMessage: makeKeys("chat_message"),
  workflowRun: makeKeys("workflow_run"),
  analyticsEvent: makeKeys("analytics_event"),
  systemLog: makeKeys("system_log"),
} as const;

export type QueryKeys = typeof keys;
