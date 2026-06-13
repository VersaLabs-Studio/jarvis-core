import { z } from 'zod';
export declare const chatMessageRoleEnum: z.ZodEnum<["user", "assistant", "system", "tool"]>;
export declare const chatMessageSelectSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    tenant_id: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system", "tool"]>;
    content: z.ZodNullable<z.ZodString>;
    model: z.ZodNullable<z.ZodString>;
    tools_used: z.ZodArray<z.ZodString, "many">;
    tokens_in: z.ZodNullable<z.ZodNumber>;
    tokens_out: z.ZodNullable<z.ZodNumber>;
    duration_ms: z.ZodNullable<z.ZodNumber>;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    created_at: string;
    metadata: Record<string, unknown> | null;
    content: string | null;
    model: string | null;
    tools_used: string[];
    tokens_in: number | null;
    tokens_out: number | null;
    duration_ms: number | null;
}, {
    id: string;
    tenant_id: string;
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    created_at: string;
    metadata: Record<string, unknown> | null;
    content: string | null;
    model: string | null;
    tools_used: string[];
    tokens_in: number | null;
    tokens_out: number | null;
    duration_ms: number | null;
}>;
export declare const chatMessageInsertSchema: z.ZodObject<{
    session_id: z.ZodString;
    tenant_id: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system", "tool"]>;
    content: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    model: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tools_used: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tokens_in: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    tokens_out: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    tools_used: string[];
    metadata?: Record<string, unknown> | null | undefined;
    content?: string | null | undefined;
    model?: string | null | undefined;
    tokens_in?: number | null | undefined;
    tokens_out?: number | null | undefined;
    duration_ms?: number | null | undefined;
}, {
    tenant_id: string;
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    metadata?: Record<string, unknown> | null | undefined;
    content?: string | null | undefined;
    model?: string | null | undefined;
    tools_used?: string[] | undefined;
    tokens_in?: number | null | undefined;
    tokens_out?: number | null | undefined;
    duration_ms?: number | null | undefined;
}>;
export type ChatMessageSelect = z.infer<typeof chatMessageSelectSchema>;
export type ChatMessageInsert = z.infer<typeof chatMessageInsertSchema>;
//# sourceMappingURL=chat-message.schema.d.ts.map