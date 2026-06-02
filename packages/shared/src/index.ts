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

// Entity config
export { ENTITY_CONFIG, type EntityKey } from './config/entities'

// Query keys
export { keys } from './lib/query-keys'
