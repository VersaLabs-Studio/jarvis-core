import type { Database } from './database.types'

export type SkillRow = Database['public']['Tables']['skills']['Row']
export type SkillInsert = Database['public']['Tables']['skills']['Insert']
export type SkillUpdate = Database['public']['Tables']['skills']['Update']

export type SkillStatus = Database['public']['Enums']['skill_status']

export type Skill = SkillRow
