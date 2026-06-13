export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    contextWindow: number;
    maxOutput: number;
    pricing: {
        input: number;
        output: number;
    };
    capabilities: string[];
    status: "available" | "limited" | "unavailable";
}
export interface OpenRouterStatus {
    connected: boolean;
    apiKeyValid: boolean;
    creditsRemaining: number;
    creditsTotal: number;
    rateLimit: {
        requestsPerMinute: number;
        currentUsage: number;
    };
    lastChecked: string;
}
export interface RoutingConfig {
    defaultModel: string;
    fallbackModel: string;
    routingStrategy: "cost" | "quality" | "balanced";
    autoFallback: boolean;
    maxRetries: number;
    timeout: number;
}
export interface ModelUsageStats {
    modelId: string;
    totalRequests: number;
    totalTokens: number;
    avgLatency: number;
    errorRate: number;
    lastUsed: string;
}
export interface ModelsResponse {
    openRouter: OpenRouterStatus;
    routing: RoutingConfig;
    models: ModelInfo[];
    usage: ModelUsageStats[];
}
//# sourceMappingURL=model.d.ts.map