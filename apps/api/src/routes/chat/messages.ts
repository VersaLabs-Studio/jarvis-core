import type { FastifyInstance } from "fastify";
import { paginated, fail } from "../../lib/response.js";
import { parsePagination } from "../../lib/pagination.js";
import "../../types/fastify";

export async function chatMessagesRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/chat/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const tenantId = request.tenantId;
    const { page, pageSize, offset } = parsePagination(request.query);

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

    const { count, error: countError } = await request.supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId);

    if (countError) {
      return fail(reply, 500, "DB_ERROR", "Failed to count messages");
    }

    const { data, error } = await request.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch messages");
    }

    return paginated(reply, data || [], {
      page,
      pageSize,
      total: count || 0,
    });
  });
}
