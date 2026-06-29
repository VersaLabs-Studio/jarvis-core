export interface ListOpts {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    session_id?: string;
}
export declare const keys: {
    readonly workflows: {
        all: () => readonly ["workflows"];
        list: (opts?: ListOpts) => readonly ["workflows", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["workflows", "doc", string];
    };
    readonly integrations: {
        all: () => readonly ["integrations"];
        list: (opts?: ListOpts) => readonly ["integrations", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["integrations", "doc", string];
    };
    readonly skills: {
        all: () => readonly ["skills"];
        list: (opts?: ListOpts) => readonly ["skills", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["skills", "doc", string];
    };
    readonly services: {
        all: () => readonly ["services"];
        list: (opts?: ListOpts) => readonly ["services", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["services", "doc", string];
    };
    readonly secrets: {
        all: () => readonly ["secrets"];
        list: (opts?: ListOpts) => readonly ["secrets", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["secrets", "doc", string];
    };
    readonly chat_sessions: {
        all: () => readonly ["chat_sessions"];
        list: (opts?: ListOpts) => readonly ["chat_sessions", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["chat_sessions", "doc", string];
    };
    readonly chat_messages: {
        all: () => readonly ["chat_messages"];
        list: (opts?: ListOpts) => readonly ["chat_messages", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["chat_messages", "doc", string];
    };
    readonly workflow_runs: {
        all: () => readonly ["workflow_runs"];
        list: (opts?: ListOpts) => readonly ["workflow_runs", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["workflow_runs", "doc", string];
    };
    readonly analytics_events: {
        all: () => readonly ["analytics_events"];
        list: (opts?: ListOpts) => readonly ["analytics_events", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["analytics_events", "doc", string];
    };
    readonly system_logs: {
        all: () => readonly ["system_logs"];
        list: (opts?: ListOpts) => readonly ["system_logs", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["system_logs", "doc", string];
    };
    readonly models: {
        all: () => readonly ["models"];
        list: (opts?: ListOpts) => readonly ["models", "list", ListOpts | undefined];
        doc: (id: string) => readonly ["models", "doc", string];
    };
    readonly service_health: {
        readonly all: () => readonly ["service_health"];
    };
};
export type QueryKeys = typeof keys;
export type CrudEntityKey = Exclude<keyof typeof keys, "service_health">;
//# sourceMappingURL=query-keys.d.ts.map