import { z } from 'zod';
export declare const profileSelectSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    email: z.ZodString;
    full_name: z.ZodNullable<z.ZodString>;
    avatar_url: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<["owner", "admin", "member", "viewer"]>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    role: "owner" | "admin" | "member" | "viewer";
    created_at: string;
    updated_at: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}, {
    id: string;
    tenant_id: string;
    role: "owner" | "admin" | "member" | "viewer";
    created_at: string;
    updated_at: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}>;
export declare const profileInsertSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    email: z.ZodString;
    full_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    role: z.ZodDefault<z.ZodEnum<["owner", "admin", "member", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenant_id: string;
    role: "owner" | "admin" | "member" | "viewer";
    email: string;
    full_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
}, {
    id: string;
    tenant_id: string;
    email: string;
    role?: "owner" | "admin" | "member" | "viewer" | undefined;
    full_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
}>;
export declare const profileUpdateSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    full_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    role: z.ZodOptional<z.ZodEnum<["owner", "admin", "member", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    role?: "owner" | "admin" | "member" | "viewer" | undefined;
    email?: string | undefined;
    full_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
}, {
    role?: "owner" | "admin" | "member" | "viewer" | undefined;
    email?: string | undefined;
    full_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
}>;
export type ProfileSelect = z.infer<typeof profileSelectSchema>;
export type ProfileInsert = z.infer<typeof profileInsertSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
//# sourceMappingURL=profile.schema.d.ts.map