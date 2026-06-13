// =============================================================================
// @jarvis/shared — Barrel Exports
// Single source of truth for all shared types, schemas, and config
// =============================================================================

// Database types (auto-generated)
export type { Database, Json } from './types/database.types.js'

// Entity types
export type { Tenant, TenantRow, TenantInsert, TenantUpdate, TenantPlan } from './types/tenant.js'
export type { Profile, ProfileRow, ProfileInsert, ProfileUpdate, ProfileRole } from './types/profile.js'
export type { Workflow, WorkflowRow, WorkflowInsert, WorkflowUpdate, WorkflowStatus } from './types/workflow.js'
export type { Integration, IntegrationRow, IntegrationInsert, IntegrationUpdate, IntegrationStatus } from './types/integration.js'
export type { Skill, SkillRow, SkillInsert, SkillUpdate, SkillStatus } from './types/skill.js'
export type { Service, ServiceRow, ServiceInsert, ServiceUpdate, ServiceStatus } from './types/service.js'
export type { Secret, SecretRow, SecretInsert, SecretUpdate, SecretType } from './types/secret.js'
export type { ChatSession, ChatSessionRow, ChatSessionInsert, ChatSessionUpdate } from './types/chat-session.js'
export type { ChatMessage, ChatMessageRow, ChatMessageInsert, ChatMessageUpdate, ChatMessageRole } from './types/chat-message.js'
export type { WorkflowRun, WorkflowRunRow, WorkflowRunInsert, WorkflowRunUpdate, WorkflowRunStatus } from './types/workflow-run.js'
export type { AnalyticsEvent, AnalyticsEventRow, AnalyticsEventInsert, AnalyticsEventUpdate } from './types/analytics-event.js'
export type { SystemLog, SystemLogRow, SystemLogInsert, SystemLogUpdate, SystemLogLevel } from './types/system-log.js'
export type { ModelInfo, OpenRouterStatus, RoutingConfig, ModelUsageStats, ModelsResponse } from './types/model.js'

// Admin types
export type { SystemInfo, SecuritySettings, BackupStatus, AdminUser, AdminOverview, FileNode, EnvVar, ConfigData } from './types/admin.js'

// Zod schemas
export {
  tenantSelectSchema,
  tenantInsertSchema,
  tenantUpdateSchema,
  type TenantSelect,
  type TenantInsert as TenantInsertData,
  type TenantUpdate as TenantUpdateData,
} from './schemas/tenant.schema.js'

export {
  profileSelectSchema,
  profileInsertSchema,
  profileUpdateSchema,
  type ProfileSelect,
  type ProfileInsert as ProfileInsertData,
  type ProfileUpdate as ProfileUpdateData,
} from './schemas/profile.schema.js'

export {
  workflowSelectSchema,
  workflowInsertSchema,
  workflowUpdateSchema,
  workflowStatusEnum,
  type WorkflowSelect,
  type WorkflowInsert as WorkflowInsertData,
  type WorkflowUpdate as WorkflowUpdateData,
} from './schemas/workflow.schema.js'

export {
  integrationSelectSchema,
  integrationInsertSchema,
  integrationUpdateSchema,
  integrationStatusEnum,
  type IntegrationSelect,
  type IntegrationInsert as IntegrationInsertData,
  type IntegrationUpdate as IntegrationUpdateData,
} from './schemas/integration.schema.js'

export {
  skillSelectSchema,
  skillInsertSchema,
  skillUpdateSchema,
  skillStatusEnum,
  type SkillSelect,
  type SkillInsert as SkillInsertData,
  type SkillUpdate as SkillUpdateData,
} from './schemas/skill.schema.js'

export {
  serviceSelectSchema,
  serviceInsertSchema,
  serviceUpdateSchema,
  serviceStatusEnum,
  type ServiceSelect,
  type ServiceInsert as ServiceInsertData,
  type ServiceUpdate as ServiceUpdateData,
} from './schemas/service.schema.js'

export {
  secretSelectSchema,
  secretInsertSchema,
  secretUpdateSchema,
  secretTypeEnum,
  type SecretSelect,
  type SecretInsert as SecretInsertData,
  type SecretUpdate as SecretUpdateData,
} from './schemas/secret.schema.js'

export {
  chatSessionSelectSchema,
  chatSessionInsertSchema,
  chatSessionUpdateSchema,
  type ChatSessionSelect,
  type ChatSessionInsert as ChatSessionInsertData,
  type ChatSessionUpdate as ChatSessionUpdateData,
} from './schemas/chat-session.schema.js'

export {
  chatMessageSelectSchema,
  chatMessageInsertSchema,
  chatMessageRoleEnum,
  type ChatMessageSelect,
  type ChatMessageInsert as ChatMessageInsertData,
} from './schemas/chat-message.schema.js'

export {
  workflowRunSelectSchema,
  workflowRunInsertSchema,
  workflowRunStatusEnum,
  type WorkflowRunSelect,
  type WorkflowRunInsert as WorkflowRunInsertData,
} from './schemas/workflow-run.schema.js'

export {
  analyticsEventSelectSchema,
  analyticsEventInsertSchema,
  type AnalyticsEventSelect,
  type AnalyticsEventInsert as AnalyticsEventInsertData,
} from './schemas/analytics-event.schema.js'

export {
  systemLogSelectSchema,
  systemLogInsertSchema,
  systemLogLevelEnum,
  type SystemLogSelect,
  type SystemLogInsert as SystemLogInsertData,
} from './schemas/system-log.schema.js'

// Entity config
export { entities, ENTITY_CONFIG, type EntityConfig, type EntityKey } from './config/entities.js'

// Query keys
export { keys, type ListOpts, type CrudEntityKey } from './lib/query-keys.js'

// API response types
export * from './types/api.js'

// Hermes wire contract + skill/cron schemas (Phase E)
export * from './types/hermes.js'
export {
  skillFrontmatterSchema,
  skillDocSchema,
  skillCategorySchema,
  skillRoleSchema,
  estimatedTimeSchema,
  type SkillFrontmatter,
  type SkillDoc,
  cronJobSchema,
  cronRegistrySchema,
  cronScheduleSchema,
  cronNotifySchema,
  type CronJob,
  type CronRegistry,
} from './schemas/index.js';
