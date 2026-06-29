import type { z } from "zod";
import { workflowInsertSchema } from "../schemas/workflow.schema.js";
import { integrationInsertSchema } from "../schemas/integration.schema.js";
import { skillInsertSchema } from "../schemas/skill.schema.js";
import { chatSessionInsertSchema } from "../schemas/chat-session.schema.js";
import { workflowRunInsertSchema } from "../schemas/workflow-run.schema.js";

export interface EntityConfig {
  table: string;
  schema: z.ZodObject<z.ZodRawShape>;
  singular: string;
  plural: string;
  readOnly?: boolean;
}

export const entities = {
  workflows: {
    table: "workflows",
    schema: workflowInsertSchema,
    singular: "workflow",
    plural: "workflows",
  },
  integrations: {
    table: "integrations",
    schema: integrationInsertSchema,
    singular: "integration",
    plural: "integrations",
  },
  skills: {
    table: "skills",
    schema: skillInsertSchema,
    singular: "skill",
    plural: "skills",
  },
  chat_session: {
    table: "chat_sessions",
    schema: chatSessionInsertSchema,
    singular: "chat_session",
    plural: "chat_sessions",
  },
  workflow_run: {
    table: "workflow_runs",
    schema: workflowRunInsertSchema,
    singular: "workflow_run",
    plural: "workflow_runs",
    readOnly: true,
  },
} as const satisfies Record<string, EntityConfig>;

export type EntityKey = keyof typeof entities;

export const ENTITY_CONFIG = entities;
