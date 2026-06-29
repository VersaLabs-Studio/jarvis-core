import type { Database } from './database.types.js';
export type SystemLogRow = Database['public']['Tables']['system_logs']['Row'];
export type SystemLogInsert = Database['public']['Tables']['system_logs']['Insert'];
export type SystemLogUpdate = Database['public']['Tables']['system_logs']['Update'];
export type SystemLogLevel = SystemLogRow['level'];
export type SystemLog = SystemLogRow;
//# sourceMappingURL=system-log.d.ts.map