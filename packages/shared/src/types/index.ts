export type { Database, Json } from './database.types.js'
export * from './api.js'
export type { Tenant, TenantRow, TenantInsert, TenantUpdate, TenantPlan } from './tenant.js'
export type { Profile, ProfileRow, ProfileInsert, ProfileUpdate, ProfileRole } from './profile.js'
export type { Workflow, WorkflowRow, WorkflowInsert, WorkflowUpdate, WorkflowStatus } from './workflow.js'
export type { Integration, IntegrationRow, IntegrationInsert, IntegrationUpdate, IntegrationStatus } from './integration.js'
export type { Skill, SkillRow, SkillInsert, SkillUpdate, SkillStatus } from './skill.js'
export type { Service, ServiceRow, ServiceInsert, ServiceUpdate, ServiceStatus } from './service.js'
export type { Secret, SecretRow, SecretInsert, SecretUpdate, SecretType } from './secret.js'
export type { ChatSession, ChatSessionRow, ChatSessionInsert, ChatSessionUpdate } from './chat-session.js'
export type { ChatMessage, ChatMessageRow, ChatMessageInsert, ChatMessageUpdate, ChatMessageRole } from './chat-message.js'
export type { WorkflowRun, WorkflowRunRow, WorkflowRunInsert, WorkflowRunUpdate, WorkflowRunStatus } from './workflow-run.js'
export type { AnalyticsEvent, AnalyticsEventRow, AnalyticsEventInsert, AnalyticsEventUpdate } from './analytics-event.js'
export type { SystemLog, SystemLogRow, SystemLogInsert, SystemLogUpdate, SystemLogLevel } from './system-log.js'
export type { SystemInfo, SecuritySettings, BackupStatus, AdminUser, AdminOverview, FileNode, EnvVar, ConfigData } from './admin.js'
export type {
  HermesMessage,
  HermesToolCall,
  HermesStreamChunk,
  HermesStreamChunkType,
  HermesStreamChunkData,
  HermesUsageMetrics,
  SendMessageParams,
  HermesRole,
  ResolvedModel,
  ChainResolution,
  ResolvedModels,
  HermesHealth,
  SkillMeta,
  SkillsListResponse,
  SkillRunResponse,
  SkillRunParams,
  McpTestParams,
  McpTestResponse,
  CronListResponse,
  CronJobMeta,
  HermesErrorCode,
} from './hermes.js'

export type ID = string
export type Timestamp = string

export interface BaseEntity {
  id: ID
  created_at: Timestamp
  updated_at: Timestamp
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: SortOrder
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}
