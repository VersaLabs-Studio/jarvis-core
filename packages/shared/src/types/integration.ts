import type { Database } from './database.types'

export type IntegrationRow = Database['public']['Tables']['integrations']['Row']
export type IntegrationInsert = Database['public']['Tables']['integrations']['Insert']
export type IntegrationUpdate = Database['public']['Tables']['integrations']['Update']

export type IntegrationStatus = Database['public']['Enums']['integration_status']

export type Integration = IntegrationRow
