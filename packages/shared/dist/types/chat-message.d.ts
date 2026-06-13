import type { Database } from './database.types.js';
export type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update'];
export type ChatMessageRole = ChatMessageRow['role'];
export type ChatMessage = ChatMessageRow;
//# sourceMappingURL=chat-message.d.ts.map