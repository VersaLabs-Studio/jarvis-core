import type { Database } from './database.types.js'

export type AnalyticsEventRow = Database['public']['Tables']['analytics_events']['Row']
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert']
export type AnalyticsEventUpdate = Database['public']['Tables']['analytics_events']['Update']

export type AnalyticsEvent = AnalyticsEventRow
