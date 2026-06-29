import { z } from 'zod';
export declare const secretTypeEnum: z.ZodEnum<["api_key", "oauth_token", "database_url", "webhook_secret", "custom"]>;
export declare const secretSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["api_key", "oauth_token", "database_url", "webhook_secret", "custom"]>;
    value: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    expires_at: z.ZodNullable<z.ZodString>;
    created_by: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    name: string;
    value: string;
    type: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom";
    created_at: string;
    updated_at: string;
    description: string | null;
    expires_at: string | null;
}, {
    id: string;
    tenant_id: string;
    created_by: string | null;
    name: string;
    value: string;
    type: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom";
    created_at: string;
    updated_at: string;
    description: string | null;
    expires_at: string | null;
}>;
export declare const secretInsertSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["api_key", "oauth_token", "database_url", "webhook_secret", "custom"]>>;
    value: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expires_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    name: string;
    value: string;
    type: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom";
    created_by?: string | null | undefined;
    description?: string | null | undefined;
    expires_at?: string | null | undefined;
}, {
    tenant_id: string;
    name: string;
    value: string;
    created_by?: string | null | undefined;
    type?: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom" | undefined;
    description?: string | null | undefined;
    expires_at?: string | null | undefined;
}>;
export declare const secretUpdateSchema: z.ZodObject<{
    tenant_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["api_key", "oauth_token", "database_url", "webhook_secret", "custom"]>>>;
    value: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    expires_at: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    name?: string | undefined;
    value?: string | undefined;
    type?: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom" | undefined;
    description?: string | null | undefined;
    expires_at?: string | null | undefined;
}, {
    tenant_id?: string | undefined;
    created_by?: string | null | undefined;
    name?: string | undefined;
    value?: string | undefined;
    type?: "api_key" | "oauth_token" | "database_url" | "webhook_secret" | "custom" | undefined;
    description?: string | null | undefined;
    expires_at?: string | null | undefined;
}>;
export type SecretSelect = z.infer<typeof secretSelectSchema>;
export type SecretInsert = z.infer<typeof secretInsertSchema>;
export type SecretUpdate = z.infer<typeof secretUpdateSchema>;
//# sourceMappingURL=secret.schema.d.ts.map