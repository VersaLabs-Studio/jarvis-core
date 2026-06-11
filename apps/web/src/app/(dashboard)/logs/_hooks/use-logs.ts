"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@jarvis/shared";
import type { SystemLog, SystemLogLevel } from "@jarvis/shared";

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/logs/stream`;
const HEARTBEAT_TIMEOUT = 45_000;
const MAX_BACKOFF = 30_000;

export interface LogFilters {
  level?: SystemLogLevel | null;
  service?: string | null;
}

export function useLogs(filters?: LogFilters) {
  return useQuery({
    queryKey: keys["system_logs"].list(filters as Record<string, unknown>),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.level) params.set("level", filters.level);
      if (filters?.service) params.set("service", filters.service);
      const qs = params.toString();
      return api.getRaw<{ data: SystemLog[] }>(`/api/cms/system_logs${qs ? `?${qs}` : ""}`);
    },
  });
}

export type SseStatus = "connecting" | "connected" | "disconnected" | "error";

export function useLogStream(filters?: LogFilters) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [status, setStatus] = useState<SseStatus>("disconnected");
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const clearTimeouts = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    clearTimeout(heartbeatTimer.current);
  }, []);

  const resetHeartbeat = useCallback(() => {
    clearTimeout(heartbeatTimer.current);
    heartbeatTimer.current = setTimeout(() => {
      esRef.current?.close();
      if (mountedRef.current) {
        setStatus("error");
        const delay = Math.min(backoffRef.current, MAX_BACKOFF);
        reconnectTimer.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
          connect();
        }, delay);
      }
    }, HEARTBEAT_TIMEOUT);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    clearTimeouts();
    esRef.current?.close();
    setStatus("connecting");

    const params = new URLSearchParams();
    if (filtersRef.current?.level) params.set("level", filtersRef.current.level);
    if (filtersRef.current?.service) params.set("service", filtersRef.current.service);
    const qs = params.toString();
    const url = `${SSE_URL}${qs ? `?${qs}` : ""}`;

    const token = localStorage.getItem("sb-access-token");
    const es = new EventSource(token ? `${url}&token=${token}` : url);
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      backoffRef.current = 1_000;
      resetHeartbeat();
    };

    es.addEventListener("log", (event) => {
      if (!mountedRef.current) return;
      resetHeartbeat();
      try {
        const log = JSON.parse(event.data) as SystemLog;
        setLogs((prev) => {
          const next = [log, ...prev];
          return next.length > 500 ? next.slice(0, 500) : next;
        });
      } catch {
        // ignore non-JSON frames
      }
    });

    es.addEventListener("heartbeat", () => {
      resetHeartbeat();
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      setStatus("error");
      const delay = Math.min(backoffRef.current, MAX_BACKOFF);
      reconnectTimer.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        connect();
      }, delay);
    };
  }, [clearTimeouts, resetHeartbeat]);

  const disconnect = useCallback(() => {
    clearTimeouts();
    mountedRef.current = false;
    esRef.current?.close();
    esRef.current = null;
    setStatus("disconnected");
  }, [clearTimeouts]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeouts();
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, clearTimeouts]);

  return { logs, status, disconnect, clearLogs };
}
