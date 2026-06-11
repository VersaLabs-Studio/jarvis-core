"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@jarvis/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import type { ChatSession, ChatMessage } from "@jarvis/shared";

export function useChatSessions() {
  return useQuery({
    queryKey: keys.chat_sessions.list(),
    queryFn: () => api.list<ChatSession>("chat_sessions"),
  });
}

export function useChatMessages(sessionId: string) {
  return useQuery({
    queryKey: keys.chat_messages.list({ session_id: sessionId }),
    queryFn: () =>
      api.getRaw<{ data: ChatMessage[] }>(
        `/api/chat/sessions/${sessionId}/messages`
      ),
    enabled: !!sessionId,
  });
}

export interface StreamChunk {
  type: "chunk" | "done" | "error";
  content?: string;
  message?: string;
}

export function useChatStream() {
  const [chunks, setChunks] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useWebSocket();
  const unsubRef = useRef<(() => void)[]>([]);

  const sendMessage = useCallback(
    (sessionId: string, message: string, model?: string) => {
      setChunks([]);
      setStreaming(true);
      setError(null);

      const unsubs: (() => void)[] = [];

      unsubs.push(
        ws.on("chat:chunk", (data: unknown) => {
          const chunk = data as StreamChunk;
          if (chunk.content) {
            setChunks((prev) => [...prev, chunk.content!]);
          }
        })
      );

      unsubs.push(
        ws.on("chat:done", () => {
          setStreaming(false);
          unsubs.forEach((u) => u());
        })
      );

      unsubs.push(
        ws.on("chat:error", (data: unknown) => {
          const err = data as { message?: string };
          setError(err.message ?? "Stream error");
          setStreaming(false);
          unsubs.forEach((u) => u());
        })
      );

      unsubs.push(
        ws.on("chat:cancelled", () => {
          setStreaming(false);
          unsubs.forEach((u) => u());
        })
      );

      unsubRef.current = unsubs;

      ws.send("chat:send", { sessionId, message, model });
    },
    [ws]
  );

  const cancel = useCallback(() => {
    ws.send("chat:cancel");
    setStreaming(false);
    unsubRef.current.forEach((u) => u());
  }, [ws]);

  return {
    sendMessage,
    cancel,
    chunks,
    streaming,
    error,
    wsStatus: ws.status,
  };
}
