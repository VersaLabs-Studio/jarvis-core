import type { Database } from './database.types.js'

export type WorkflowRow = Database['public']['Tables']['workflows']['Row']
export type WorkflowInsert = Database['public']['Tables']['workflows']['Insert']
export type WorkflowUpdate = Database['public']['Tables']['workflows']['Update']

export type WorkflowStatus = Database['public']['Enums']['workflow_status']

export type Workflow = WorkflowRow
