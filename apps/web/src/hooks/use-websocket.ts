"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

interface WsMessage {
  type: string;
  data?: unknown;
}

const HEARTBEAT_INTERVAL = 25_000;
const RECONNECT_MAX = 30_000;

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backoffRef = useRef(1_000);
  const mountedRef = useRef(true);
  const refreshedRef = useRef(false);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  const clearTimeouts = useCallback(() => {
    clearInterval(heartbeatRef.current);
    clearTimeout(reconnectRef.current);
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    clearTimeouts();
    wsRef.current?.close();
    setStatus("connecting");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus("error");
      return;
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws")}/ws?token=${session.access_token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        backoffRef.current = 1_000;
        refreshedRef.current = false;

        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          const handlers = handlersRef.current.get(msg.type);
          if (handlers) {
            handlers.forEach((h) => h(msg.data));
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        clearTimeouts();

        if (event.code === 4401) {
          if (!refreshedRef.current) {
            refreshedRef.current = true;
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              if (s) {
                connect();
              } else {
                window.location.href = "/login";
              }
            });
          } else {
            window.location.href = "/login";
          }
          return;
        }

        setStatus("disconnected");
        const delay = Math.min(backoffRef.current, RECONNECT_MAX);
        reconnectRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, RECONNECT_MAX);
          connect();
        }, delay);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
      };
    } catch {
      if (mountedRef.current) {
        setStatus("error");
      }
    }
  }, [clearTimeouts]);

  const disconnect = useCallback(() => {
    clearTimeouts();
    mountedRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, [clearTimeouts]);

  const send = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  const on = useCallback((type: string, handler: (data: unknown) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeouts();
      wsRef.current?.close();
    };
  }, [connect, clearTimeouts]);

  return { status, send, on, disconnect };
}
