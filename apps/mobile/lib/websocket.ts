// D-WS-1: On 4401 → refreshSession() once (NOT getSession()) — PC-WS-1 lesson

import { supabase } from './supabase';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsMessage {
  type: string;
  data?: unknown;
}

type WsHandler = (data: unknown) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL = 25_000;
const RECONNECT_MAX = 30_000;
const RECONNECT_BASE = 1_000;

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

function getWsUrl(): string {
  const apiUrl =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    'http://localhost:4000';

  return apiUrl.replace(/^http/, 'ws') + '/ws';
}

// ---------------------------------------------------------------------------
// WebSocket factory (NOT a React hook — hooks come in D4)
// ---------------------------------------------------------------------------

export function createWebSocket() {
  let ws: WebSocket | null = null;
  let status: WsStatus = 'disconnected';
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let refreshed = false;
  let disposed = false;

  const handlers = new Map<string, Set<WsHandler>>();
  const statusHandlers = new Set<(s: WsStatus) => void>();

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function setStatus(s: WsStatus): void {
    status = s;
    statusHandlers.forEach((h) => h(s));
  }

  function clearTimers(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function startHeartbeat(): void {
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function scheduleReconnect(): void {
    if (disposed) return;

    const delay = Math.min(
      RECONNECT_BASE * Math.pow(2, reconnectAttempt),
      RECONNECT_MAX,
    );

    reconnectAttempt++;

    reconnectTimer = setTimeout(() => {
      void connect();
    }, delay);
  }

  // -----------------------------------------------------------------------
  // Core
  // -----------------------------------------------------------------------

  async function connect(): Promise<void> {
    if (disposed) return;

    clearTimers();

    setStatus('connecting');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus('error');
      return;
    }

    const url = `${getWsUrl()}?token=${encodeURIComponent(session.access_token)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempt = 0;
      refreshed = false;
      setStatus('connected');
      startHeartbeat();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(String(event.data)) as WsMessage;
        const set = handlers.get(msg.type);
        if (set) {
          set.forEach((h) => h(msg.data));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event: CloseEvent) => {
      clearTimers();
      setStatus('disconnected');

      if (event.code === 4401) {
        // D-WS-1: refreshSession() once — NOT getSession()
        if (!refreshed) {
          refreshed = true;
          void supabase.auth.refreshSession().then(({ error }) => {
            if (error) {
              setStatus('error');
            } else {
              reconnectAttempt = 0;
              void connect();
            }
          });
        } else {
          setStatus('error');
        }
        return;
      }

      if (!disposed) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror — reconnect handled there
    };
  }

  function disconnect(): void {
    disposed = true;
    clearTimers();

    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
      ws = null;
    }

    setStatus('disconnected');
    handlers.clear();
    statusHandlers.clear();
  }

  function send(type: string, data?: unknown): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  function on(type: string, handler: WsHandler): () => void {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);

    return () => {
      handlers.get(type)?.delete(handler);
    };
  }

  function onStatus(handler: (s: WsStatus) => void): () => void {
    statusHandlers.add(handler);
    return () => {
      statusHandlers.delete(handler);
    };
  }

  return {
    connect,
    disconnect,
    send,
    on,
    onStatus,
    get status() {
      return status;
    },
  };
}
