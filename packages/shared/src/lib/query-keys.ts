import type { EntityKey } from "../config/entities.js";

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
  // D6 §6 carryover: bespoke non-CRUD key for the dashboard service-health query
  service_health: {
    all: () => ["service_health"] as const,
  },
} as const;

export type QueryKeys = typeof keys;

// D6 §6 carryover: type that excludes non-CRUD keys (e.g. service_health) from
// the CRUD-typed hooks in apps/mobile/hooks/use-entity.ts. CRUD hooks require
// `list` + `doc` + `all`; bespoke keys only have `all`.
export type CrudEntityKey = Exclude<keyof typeof keys, "service_health">;
