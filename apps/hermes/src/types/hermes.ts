// =============================================================================
// Server-side Hermes types (re-exported from @jarvis/shared for local use).
// The wire contract is owned by @jarvis/shared — this file exists for
// grep-ability of "where does Hermes define its types" inside apps/hermes.
// =============================================================================

export type {
  HermesMessage,
  HermesToolCall,
  HermesStreamChunk,
  HermesStreamChunkType,
  HermesStreamChunkData,
  HermesUsageMetrics,
  SendMessageParams,
  HermesRole,
  ResolvedModel,
  ChainResolution,
  ResolvedModels,
  HermesHealth,
  SkillMeta,
  SkillsListResponse,
  SkillRunResponse,
  SkillRunParams,
  McpTestParams,
  McpTestResponse,
  CronListResponse,
  CronJobMeta,
  HermesErrorCode,
} from "@jarvis/shared";
