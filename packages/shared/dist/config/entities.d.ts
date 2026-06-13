import type { z } from "zod";
export interface EntityConfig {
    table: string;
    schema: z.ZodObject<z.ZodRawShape>;
    singular: string;
    plural: string;
    readOnly?: boolean;
}
export declare const entities: {
    readonly workflows: {
        readonly table: "workflows";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>;
            definition: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            version: z.ZodDefault<z.ZodNumber>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "draft" | "active" | "paused" | "archived";
            name: string;
            version: number;
            created_by?: string | null | undefined;
            description?: string | null | undefined;
            definition?: Record<string, unknown> | undefined;
        }, {
            tenant_id: string;
            name: string;
            created_by?: string | null | undefined;
            status?: "draft" | "active" | "paused" | "archived" | undefined;
            description?: string | null | undefined;
            definition?: Record<string, unknown> | undefined;
            version?: number | undefined;
        }>;
        readonly singular: "workflow";
        readonly plural: "workflows";
    };
    readonly integrations: {
        readonly table: "integrations";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            provider: z.ZodString;
            status: z.ZodDefault<z.ZodEnum<["pending", "connected", "disconnected", "error"]>>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "pending" | "connected" | "disconnected" | "error";
            name: string;
            provider: string;
            created_by?: string | null | undefined;
            config?: Record<string, unknown> | undefined;
            metadata?: Record<string, unknown> | undefined;
        }, {
            tenant_id: string;
            name: string;
            provider: string;
            created_by?: string | null | undefined;
            status?: "pending" | "connected" | "disconnected" | "error" | undefined;
            config?: Record<string, unknown> | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>;
        readonly singular: "integration";
        readonly plural: "integrations";
    };
    readonly skills: {
        readonly table: "skills";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "disabled", "archived"]>>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            version: z.ZodDefault<z.ZodNumber>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "draft" | "active" | "archived" | "disabled";
            name: string;
            version: number;
            created_by?: string | null | undefined;
            description?: string | null | undefined;
            config?: Record<string, unknown> | undefined;
            capabilities?: string[] | undefined;
        }, {
            tenant_id: string;
            name: string;
            created_by?: string | null | undefined;
            status?: "draft" | "active" | "archived" | "disabled" | undefined;
            description?: string | null | undefined;
            version?: number | undefined;
            config?: Record<string, unknown> | undefined;
            capabilities?: string[] | undefined;
        }>;
        readonly singular: "skill";
        readonly plural: "skills";
    };
    readonly chat_session: {
        readonly table: "chat_sessions";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            title: z.ZodDefault<z.ZodString>;
            context: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
            is_active: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            title: string;
            is_active: boolean;
            context?: Record<string, unknown> | null | undefined;
        }, {
            tenant_id: string;
            title?: string | undefined;
            context?: Record<string, unknown> | null | undefined;
            is_active?: boolean | undefined;
        }>;
        readonly singular: "chat_session";
        readonly plural: "chat_sessions";
    };
    readonly workflow_run: {
        readonly table: "workflow_runs";
        readonly schema: z.ZodObject<{
            workflow_id: z.ZodString;
            tenant_id: z.ZodString;
            status: z.ZodDefault<z.ZodEnum<["pending", "running", "success", "failed", "cancelled"]>>;
            output: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            error: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            started_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            finished_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            duration_ms: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            workflow_id: string;
            status: "pending" | "running" | "success" | "failed" | "cancelled";
            error?: string | null | undefined;
            duration_ms?: number | null | undefined;
            output?: string | null | undefined;
            started_at?: string | null | undefined;
            finished_at?: string | null | undefined;
        }, {
            tenant_id: string;
            workflow_id: string;
            error?: string | null | undefined;
            status?: "pending" | "running" | "success" | "failed" | "cancelled" | undefined;
            duration_ms?: number | null | undefined;
            output?: string | null | undefined;
            started_at?: string | null | undefined;
            finished_at?: string | null | undefined;
        }>;
        readonly singular: "workflow_run";
        readonly plural: "workflow_runs";
        readonly readOnly: true;
    };
};
export type EntityKey = keyof typeof entities;
export declare const ENTITY_CONFIG: {
    readonly workflows: {
        readonly table: "workflows";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>;
            definition: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            version: z.ZodDefault<z.ZodNumber>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "draft" | "active" | "paused" | "archived";
            name: string;
            version: number;
            created_by?: string | null | undefined;
            description?: string | null | undefined;
            definition?: Record<string, unknown> | undefined;
        }, {
            tenant_id: string;
            name: string;
            created_by?: string | null | undefined;
            status?: "draft" | "active" | "paused" | "archived" | undefined;
            description?: string | null | undefined;
            definition?: Record<string, unknown> | undefined;
            version?: number | undefined;
        }>;
        readonly singular: "workflow";
        readonly plural: "workflows";
    };
    readonly integrations: {
        readonly table: "integrations";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            provider: z.ZodString;
            status: z.ZodDefault<z.ZodEnum<["pending", "connected", "disconnected", "error"]>>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "pending" | "connected" | "disconnected" | "error";
            name: string;
            provider: string;
            created_by?: string | null | undefined;
            config?: Record<string, unknown> | undefined;
            metadata?: Record<string, unknown> | undefined;
        }, {
            tenant_id: string;
            name: string;
            provider: string;
            created_by?: string | null | undefined;
            status?: "pending" | "connected" | "disconnected" | "error" | undefined;
            config?: Record<string, unknown> | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>;
        readonly singular: "integration";
        readonly plural: "integrations";
    };
    readonly skills: {
        readonly table: "skills";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            name: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "disabled", "archived"]>>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            version: z.ZodDefault<z.ZodNumber>;
            created_by: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            status: "draft" | "active" | "archived" | "disabled";
            name: string;
            version: number;
            created_by?: string | null | undefined;
            description?: string | null | undefined;
            config?: Record<string, unknown> | undefined;
            capabilities?: string[] | undefined;
        }, {
            tenant_id: string;
            name: string;
            created_by?: string | null | undefined;
            status?: "draft" | "active" | "archived" | "disabled" | undefined;
            description?: string | null | undefined;
            version?: number | undefined;
            config?: Record<string, unknown> | undefined;
            capabilities?: string[] | undefined;
        }>;
        readonly singular: "skill";
        readonly plural: "skills";
    };
    readonly chat_session: {
        readonly table: "chat_sessions";
        readonly schema: z.ZodObject<{
            tenant_id: z.ZodString;
            title: z.ZodDefault<z.ZodString>;
            context: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
            is_active: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            title: string;
            is_active: boolean;
            context?: Record<string, unknown> | null | undefined;
        }, {
            tenant_id: string;
            title?: string | undefined;
            context?: Record<string, unknown> | null | undefined;
            is_active?: boolean | undefined;
        }>;
        readonly singular: "chat_session";
        readonly plural: "chat_sessions";
    };
    readonly workflow_run: {
        readonly table: "workflow_runs";
        readonly schema: z.ZodObject<{
            workflow_id: z.ZodString;
            tenant_id: z.ZodString;
            status: z.ZodDefault<z.ZodEnum<["pending", "running", "success", "failed", "cancelled"]>>;
            output: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            error: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            started_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            finished_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            duration_ms: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            tenant_id: string;
            workflow_id: string;
            status: "pending" | "running" | "success" | "failed" | "cancelled";
            error?: string | null | undefined;
            duration_ms?: number | null | undefined;
            output?: string | null | undefined;
            started_at?: string | null | undefined;
            finished_at?: string | null | undefined;
        }, {
            tenant_id: string;
            workflow_id: string;
            error?: string | null | undefined;
            status?: "pending" | "running" | "success" | "failed" | "cancelled" | undefined;
            duration_ms?: number | null | undefined;
            output?: string | null | undefined;
            started_at?: string | null | undefined;
            finished_at?: string | null | undefined;
        }>;
        readonly singular: "workflow_run";
        readonly plural: "workflow_runs";
        readonly readOnly: true;
    };
};
//# sourceMappingURL=entities.d.ts.map