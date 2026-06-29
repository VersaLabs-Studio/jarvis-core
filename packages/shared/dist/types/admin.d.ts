export interface SystemInfo {
    version: string;
    uptime: number;
    environment: string;
    nodeVersion: string;
    platform: string;
    memory: {
        total: number;
        used: number;
        free: number;
    };
    cpu: {
        cores: number;
        model: string;
        usage: number;
    };
}
export interface SecuritySettings {
    mfaEnabled: boolean;
    sessionTimeout: number;
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
    };
    ipWhitelist: string[];
    rateLimiting: {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
    };
}
export interface BackupStatus {
    lastBackup: string | null;
    backupSize: number | null;
    status: "idle" | "running" | "failed" | "completed";
    schedule: string;
    retention: number;
}
export interface AdminUser {
    id: string;
    email: string;
    role: string;
    lastSignIn: string | null;
    createdAt: string;
    status: "active" | "inactive" | "suspended";
}
export interface AdminOverview {
    system: SystemInfo;
    security: SecuritySettings;
    backup: BackupStatus;
    users: AdminUser[];
    stats: {
        totalUsers: number;
        activeUsers: number;
        totalWorkflows: number;
        totalIntegrations: number;
    };
}
export interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    children?: FileNode[];
    lastModified?: string;
}
export interface EnvVar {
    key: string;
    value: string;
    masked: boolean;
    description?: string;
}
export interface ConfigData {
    files: FileNode[];
    envVars: EnvVar[];
    rawConfig: string;
}
//# sourceMappingURL=admin.d.ts.map