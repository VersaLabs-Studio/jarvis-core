import type { Database } from './database.types.js'

export type WorkflowRunRow = Database['public']['Tables']['workflow_runs']['Row']
export type WorkflowRunInsert = Database['public']['Tables']['workflow_runs']['Insert']
export type WorkflowRunUpdate = Database['public']['Tables']['workflow_runs']['Update']

export type WorkflowRunStatus = WorkflowRunRow['status']

export type WorkflowRun = WorkflowRunRow
