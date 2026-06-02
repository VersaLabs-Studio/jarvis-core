import type { Database } from './database.types'

export type TenantRow = Database['public']['Tables']['tenants']['Row']
export type TenantInsert = Database['public']['Tables']['tenants']['Insert']
export type TenantUpdate = Database['public']['Tables']['tenants']['Update']

export type TenantPlan = TenantRow['plan']

export type Tenant = TenantRow
