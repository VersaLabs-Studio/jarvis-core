export type { Database, Json } from './database.types'
export type { Tenant, TenantRow, TenantInsert, TenantUpdate, TenantPlan } from './tenant'
export type { Profile, ProfileRow, ProfileInsert, ProfileUpdate, ProfileRole } from './profile'
export type { Workflow, WorkflowRow, WorkflowInsert, WorkflowUpdate, WorkflowStatus } from './workflow'
export type { Integration, IntegrationRow, IntegrationInsert, IntegrationUpdate, IntegrationStatus } from './integration'
export type { Skill, SkillRow, SkillInsert, SkillUpdate, SkillStatus } from './skill'
export type { Service, ServiceRow, ServiceInsert, ServiceUpdate, ServiceStatus } from './service'
export type { Secret, SecretRow, SecretInsert, SecretUpdate, SecretType } from './secret'

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
