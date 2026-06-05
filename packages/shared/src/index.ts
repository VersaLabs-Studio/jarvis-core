// =============================================================================
// @jarvis/shared — Barrel Exports
// Single source of truth for all shared types, schemas, and config
// =============================================================================

// Database types (auto-generated)
export type { Database, Json } from './types/database.types'

// Entity types
export type { Tenant, TenantRow, TenantInsert, TenantUpdate, TenantPlan } from './types/tenant'
export type { Profile, ProfileRow, ProfileInsert, ProfileUpdate, ProfileRole } from './types/profile'
export type { Workflow, WorkflowRow, WorkflowInsert, WorkflowUpdate, WorkflowStatus } from './types/workflow'
export type { Integration, IntegrationRow, IntegrationInsert, IntegrationUpdate, IntegrationStatus } from './types/integration'
export type { Skill, SkillRow, SkillInsert, SkillUpdate, SkillStatus } from './types/skill'
export type { Service, ServiceRow, ServiceInsert, ServiceUpdate, ServiceStatus } from './types/service'
export type { Secret, SecretRow, SecretInsert, SecretUpdate, SecretType } from './types/secret'
export type { ChatSession, ChatSessionRow, ChatSessionInsert, ChatSessionUpdate } from './types/chat-session'
export type { ChatMessage, ChatMessageRow, ChatMessageInsert, ChatMessageUpdate, ChatMessageRole } from './types/chat-message'
export type { WorkflowRun, WorkflowRunRow, WorkflowRunInsert, WorkflowRunUpdate, WorkflowRunStatus } from './types/workflow-run'
export type { AnalyticsEvent, AnalyticsEventRow, AnalyticsEventInsert, AnalyticsEventUpdate } from './types/analytics-event'
export type { SystemLog, SystemLogRow, SystemLogInsert, SystemLogUpdate, SystemLogLevel } from './types/system-log'

// Zod schemas
export {
  tenantSelectSchema,
  tenantInsertSchema,
  tenantUpdateSchema,
  type TenantSelect,
  type TenantInsert as TenantInsertData,
  type TenantUpdate as TenantUpdateData,
} from './schemas/tenant.schema'

export {
  profileSelectSchema,
  profileInsertSchema,
  profileUpdateSchema,
  type ProfileSelect,
  type ProfileInsert as ProfileInsertData,
  type ProfileUpdate as ProfileUpdateData,
} from './schemas/profile.schema'

export {
  workflowSelectSchema,
  workflowInsertSchema,
  workflowUpdateSchema,
  workflowStatusEnum,
  type WorkflowSelect,
  type WorkflowInsert as WorkflowInsertData,
  type WorkflowUpdate as WorkflowUpdateData,
} from './schemas/workflow.schema'

export {
  integrationSelectSchema,
  integrationInsertSchema,
  integrationUpdateSchema,
  integrationStatusEnum,
  type IntegrationSelect,
  type IntegrationInsert as IntegrationInsertData,
  type IntegrationUpdate as IntegrationUpdateData,
} from './schemas/integration.schema'

export {
  skillSelectSchema,
  skillInsertSchema,
  skillUpdateSchema,
  skillStatusEnum,
  type SkillSelect,
  type SkillInsert as SkillInsertData,
  type SkillUpdate as SkillUpdateData,
} from './schemas/skill.schema'

export {
  serviceSelectSchema,
  serviceInsertSchema,
  serviceUpdateSchema,
  serviceStatusEnum,
  type ServiceSelect,
  type ServiceInsert as ServiceInsertData,
  type ServiceUpdate as ServiceUpdateData,
} from './schemas/service.schema'

export {
  secretSelectSchema,
  secretInsertSchema,
  secretUpdateSchema,
  secretTypeEnum,
  type SecretSelect,
  type SecretInsert as SecretInsertData,
  type SecretUpdate as SecretUpdateData,
} from './schemas/secret.schema'

export {
  chatSessionSelectSchema,
  chatSessionInsertSchema,
  chatSessionUpdateSchema,
  type ChatSessionSelect,
  type ChatSessionInsert as ChatSessionInsertData,
  type ChatSessionUpdate as ChatSessionUpdateData,
} from './schemas/chat-session.schema'

export {
  chatMessageSelectSchema,
  chatMessageInsertSchema,
  chatMessageRoleEnum,
  type ChatMessageSelect,
  type ChatMessageInsert as ChatMessageInsertData,
} from './schemas/chat-message.schema'

export {
  workflowRunSelectSchema,
  workflowRunInsertSchema,
  workflowRunStatusEnum,
  type WorkflowRunSelect,
  type WorkflowRunInsert as WorkflowRunInsertData,
} from './schemas/workflow-run.schema'

export {
  analyticsEventSelectSchema,
  analyticsEventInsertSchema,
  type AnalyticsEventSelect,
  type AnalyticsEventInsert as AnalyticsEventInsertData,
} from './schemas/analytics-event.schema'

export {
  systemLogSelectSchema,
  systemLogInsertSchema,
  systemLogLevelEnum,
  type SystemLogSelect,
  type SystemLogInsert as SystemLogInsertData,
} from './schemas/system-log.schema'

// Entity config
export { entities, ENTITY_CONFIG, type EntityConfig, type EntityKey } from './config/entities'

// Query keys
export { keys } from './lib/query-keys'

// API response types
export * from './types/api'
