import type { FastifyInstance } from "fastify";
import { ok, paginated, fail } from "../../lib/response.js";
import "../../types/fastify";

export async function chatSessionsRoute(fastify: FastifyInstance): Promise<void> {
  // List sessions
  fastify.get('/api/chat/sessions', async (request, reply) => {
    const tenantId = request.tenantId;
    const query = (request.query ?? {}) as Record<string, unknown>;
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const { count, error: countError } = await request.supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) {
      return fail(reply, 500, "DB_ERROR", "Failed to count sessions");
    }

    const { data, error } = await request.supabase
      .from('chat_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch sessions");
    }

    return paginated(reply, data || [], {
      page,
      pageSize,
      total: count || 0,
    });
  });

  // Create session
  fastify.post('/api/chat/sessions', async (request, reply) => {
    const tenantId = request.tenantId;
    const { title, context } = request.body as { title?: string; context?: unknown };

    const { data, error } = await request.supabase
      .from('chat_sessions')
      .insert({
        tenant_id: tenantId,
        title: title || 'New Chat',
        context: context || {},
      })
      .select()
      .single();

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to create session");
    }

    return ok(reply, data, 201);
  });

  // Delete session
  fastify.delete('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const { error } = await request.supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      return fail(reply, 404, "NOT_FOUND", "Session not found");
    }

    return reply.code(204).send();
  });
}
