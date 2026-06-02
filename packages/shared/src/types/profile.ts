import type { Database } from './database.types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type ProfileRole = ProfileRow['role']

export type Profile = ProfileRow
