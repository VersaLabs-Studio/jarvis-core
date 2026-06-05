import type { Database } from './database.types'

export type SecretRow = Database['public']['Tables']['secrets']['Row']
export type SecretInsert = Database['public']['Tables']['secrets']['Insert']
export type SecretUpdate = Database['public']['Tables']['secrets']['Update']

export type SecretType = Database['public']['Enums']['secret_type']

export type Secret = SecretRow
