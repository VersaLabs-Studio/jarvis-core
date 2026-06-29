const makeKeys = (entity) => ({
    all: () => [entity],
    list: (opts) => [entity, "list", opts],
    doc: (id) => [entity, "doc", id],
});
export const keys = {
    workflows: makeKeys("workflows"),
    integrations: makeKeys("integrations"),
    skills: makeKeys("skills"),
    services: makeKeys("services"),
    secrets: makeKeys("secrets"),
    chat_sessions: makeKeys("chat_sessions"),
    chat_messages: makeKeys("chat_messages"),
    workflow_runs: makeKeys("workflow_runs"),
    analytics_events: makeKeys("analytics_events"),
    system_logs: makeKeys("system_logs"),
    models: makeKeys("models"),
    // D6 §6 carryover: bespoke non-CRUD key for the dashboard service-health query
    service_health: {
        all: () => ["service_health"],
    },
};
//# sourceMappingURL=query-keys.js.map