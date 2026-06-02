import type { Database } from './database.types'

export type ServiceRow = Database['public']['Tables']['services']['Row']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type ServiceUpdate = Database['public']['Tables']['services']['Update']

export type ServiceStatus = Database['public']['Enums']['service_status']

export type Service = ServiceRow
