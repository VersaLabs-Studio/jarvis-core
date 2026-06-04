import type { FastifyInstance } from "fastify";
import { getHermesClient } from "../../lib/hermes.js";
import { fail } from "../../lib/response.js";
import "../../types/fastify";

export async function chatSendRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/chat/send', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const { sessionId, message, model, tools } = request.body as {
      sessionId: string;
      message: string;
      model?: string;
      tools?: string[];
    };

    if (!sessionId || !message) {
      return fail(reply, 422, "VALIDATION", "sessionId and message are required");
    }

    // Verify session belongs to tenant
    const { data: session, error: sessionError } = await request.supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .single();

    if (sessionError || !session) {
      return fail(reply, 404, "NOT_FOUND", "Chat session not found");
    }

    // Save user message to chat_messages
    const { error: insertError } = await request.supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        tenant_id: tenantId,
        role: 'user',
        content: message,
        model,
      });

    if (insertError) {
      console.error('Failed to save user message:', insertError);
      return fail(reply, 500, "DB_ERROR", "Failed to save message");
    }

    // Set SSE headers for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    const hermes = getHermesClient();
    let fullContent = '';
    let tokensIn = 0;
    let tokensOut = 0;
    let durationMs = 0;
    const toolsUsed: string[] = [];

    try {
      const stream = hermes.sendMessage({
        sessionId,
        message,
        model,
        tools,
      });

      for await (const chunk of stream) {
        // Send chunk to client
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);

        // Accumulate response
        if (chunk.type === 'chunk' && chunk.data.content) {
          fullContent += chunk.data.content;
        }
        if (chunk.type === 'tool_call' && chunk.data.tool) {
          toolsUsed.push(chunk.data.tool);
        }
        if (chunk.type === 'done' && chunk.data.usage) {
          tokensIn = chunk.data.usage.tokens_in;
          tokensOut = chunk.data.usage.tokens_out;
          durationMs = chunk.data.usage.duration_ms;
        }
      }

      // Save assistant message to chat_messages
      const { error: assistantError } = await request.supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          tenant_id: tenantId,
          role: 'assistant',
          content: fullContent,
          model,
          tools_used: toolsUsed,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          duration_ms: durationMs,
        });

      if (assistantError) {
        console.error('Failed to save assistant message:', assistantError);
      }

      // Send done signal
      reply.raw.write('data: [DONE]\n\n');
    } catch (err) {
      console.error('Hermes stream error:', err);
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', data: { error: 'Stream failed' } })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });
}
