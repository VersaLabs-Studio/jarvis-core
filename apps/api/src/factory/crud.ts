import type { FastifyInstance } from "fastify";
import type { EntityConfig } from "@jarvis/shared";
import { ok, paginated, fail, validationError } from "../lib/response.js";
import "../types/fastify.js";

interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

function parsePagination(request: { query: unknown }): PaginationParams {
  const query = (request.query ?? {}) as Record<string, unknown>;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

export async function registerCrud(
  fastify: FastifyInstance,
  entityName: string,
  config: EntityConfig
): Promise<void> {
  const { table, schema, singular, plural, readOnly } = config;

  fastify.get(`/api/cms/${plural}`, async (request, reply) => {
    const { offset, limit, page, pageSize } = parsePagination(request);
    const tenantId = request.tenantId;

    const { count, error: countError } = await request.supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (countError) {
      return fail(reply, 500, "DB_ERROR", "Failed to count records");
    }

    const { data, error } = await request.supabase
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch records");
    }

    return paginated(reply, data || [], {
      page,
      pageSize,
      total: count || 0,
    });
  });

  fastify.get(`/api/cms/${plural}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const { data, error } = await request.supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return fail(reply, 404, "NOT_FOUND", `${singular} not found`);
    }

    return ok(reply, data);
  });

  if (readOnly) {
    fastify.log.info(`Registered read-only CRUD routes for entity: ${plural} (list/get only)`);
    return;
  }

  fastify.post(`/api/cms/${plural}`, async (request, reply) => {
    const tenantId = request.tenantId;

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return validationError(reply, result.error.flatten());
    }

    const { data, error } = await request.supabase
      .from(table)
      .insert({ ...result.data, tenant_id: tenantId })
      .select()
      .single();

    if (error) {
      return fail(reply, 500, "DB_ERROR", `Failed to create ${singular}`);
    }

    return ok(reply, data, 201);
  });

  fastify.patch(`/api/cms/${plural}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = schema.partial().safeParse(request.body);
    if (!result.success) {
      return validationError(reply, result.error.flatten());
    }

    const { data, error } = await request.supabase
      .from(table)
      .update(result.data)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error || !data) {
      return fail(reply, 404, "NOT_FOUND", `${singular} not found`);
    }

    return ok(reply, data);
  });

  fastify.delete(`/api/cms/${plural}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const { error } = await request.supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return fail(reply, 404, "NOT_FOUND", `${singular} not found`);
    }

    return reply.code(204).send();
  });

  fastify.log.info(`Registered full CRUD routes for entity: ${plural}`);
}
