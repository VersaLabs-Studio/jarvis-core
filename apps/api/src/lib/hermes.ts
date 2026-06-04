import { env } from "./env.js";

export interface HermesMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  model?: string;
  tools_used?: string[];
}

export interface HermesStreamChunk {
  type: 'chunk' | 'tool_call' | 'done' | 'error';
  data: {
    content?: string;
    tool?: string;
    args?: unknown;
    error?: string;
    usage?: {
      tokens_in: number;
      tokens_out: number;
      duration_ms: number;
    };
  };
}

export interface SendMessageParams {
  sessionId: string;
  message: string;
  model?: string;
  tools?: string[];
  history?: HermesMessage[];
}

export class HermesClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = env.HERMES_URL || 'http://hermes:8765';
    this.timeout = 120_000; // 2 minutes for generation
  }

  async health(): Promise<{ status: string; uptime: number }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Hermes health check failed: ${response.status}`);
    }

    return response.json() as Promise<{ status: string; uptime: number }>;
  }

  async *sendMessage(params: SendMessageParams): AsyncGenerator<HermesStreamChunk> {
    const { sessionId, message, model, tools, history } = params;

    const response = await fetch(`${this.baseUrl}/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        model,
        tools,
        history,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hermes error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body from Hermes');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk = JSON.parse(data) as HermesStreamChunk;
              yield chunk;
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Singleton instance
let _hermes: HermesClient | null = null;

export function getHermesClient(): HermesClient {
  if (!_hermes) {
    _hermes = new HermesClient();
  }
  return _hermes;
}
