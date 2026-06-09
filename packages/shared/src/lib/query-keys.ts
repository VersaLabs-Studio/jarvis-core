import type { EntityKey } from "../config/entities";

export interface ListOpts {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  session_id?: string;  // For chat messages filtering
}

const makeKeys = <K extends string>(entity: K) => ({
  all: () => [entity] as const,
  list: (opts?: ListOpts) => [entity, "list", opts] as const,
  doc: (id: string) => [entity, "doc", id] as const,
});

export const keys = {
  workflows: makeKeys("workflows"),
  integrations: makeKeys("integrations"),
  skills: makeKeys("skills"),
  services: makeKeys("services"),
  secrets: makeKeys("secrets"),
  chat_sessions: makeKeys("chat_sessions"),
  chat_messages: makeKeys("chat_messages"),
  workflow_runs: makeKeys("workflow_runs"),
  analytics_events: makeKeys("analytics_events"),
  system_logs: makeKeys("system_logs"),
  models: makeKeys("models"),
} as const;

export type QueryKeys = typeof keys;
