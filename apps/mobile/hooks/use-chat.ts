// D4: Chat hooks — session management + streaming
// Uses shared keys from @jarvis/shared, no inline tuples

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '@jarvis/shared';
import type { ChatSession, ChatMessage } from '@jarvis/shared';
import { api } from '@/lib/api';
import { createWebSocket, type WsStatus } from '@/lib/websocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// WebSocket singleton for chat streaming
// ---------------------------------------------------------------------------

let wsInstance: ReturnType<typeof createWebSocket> | null = null;

function getWs() {
  if (!wsInstance) {
    wsInstance = createWebSocket();
  }
  return wsInstance;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessageLocal {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UseChatReturn {
  sessions: ChatSession[];
  sessionsLoading: boolean;
  sessionsError: Error | null;
  activeSession: ChatSession | null;
  setActiveSession: (session: ChatSession | null) => void;
  messages: ChatMessageLocal[];
  messagesLoading: boolean;
  messagesError: Error | null;
  sendMessage: (content: string) => Promise<void>;
  createSession: (title?: string) => Promise<ChatSession>;
  sendStreaming: boolean;
  wsStatus: WsStatus;
  refreshSessions: () => void;
  refreshMessages: () => void;
}

// ---------------------------------------------------------------------------
// Session hooks
// ---------------------------------------------------------------------------

export function useChatSessions() {
  return useQuery({
    queryKey: keys.chat_sessions.list(),
    queryFn: () =>
      api.getRaw<{ data: ChatSession[]; total: number }>(
        '/api/chat/sessions',
      ),
    staleTime: 30_000,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) =>
      api.post<{ data: ChatSession }>('/api/chat/sessions', {
        title: title ?? 'New Chat',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.chat_sessions.all() });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (e: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Failed to create session');
    },
  });
}

// ---------------------------------------------------------------------------
// Message hooks
// ---------------------------------------------------------------------------

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: keys.chat_messages.list({ session_id: sessionId ?? undefined }),
    queryFn: () =>
      api.getRaw<{ data: ChatMessage[] }>(
        `/api/chat/sessions/${sessionId}/messages`,
      ),
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Combined chat hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [streamingMessages, setStreamingMessages] = useState<
    ChatMessageLocal[]
  >([]);
  const [sendStreaming, setSendStreaming] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const streamingContentRef = useRef('');
  const streamingIdRef = useRef('');
  const activeSessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Queries
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refreshSessions,
  } = useChatSessions();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refreshMessages,
  } = useChatMessages(activeSession?.id ?? null);

  // Mutations
  const createSessionMutation = useCreateChatSession();

  // Transform API messages to local format
  const apiMessages: ChatMessageLocal[] = (messagesData?.data ?? []).map(
    (msg) => ({
      id: msg.id,
      content: msg.content ?? '',
      role: msg.role === 'user' ? 'user' : 'assistant',
      timestamp: new Date(msg.created_at),
    }),
  );

  // Merge API + streaming messages, dedup by id
  const seenIds = new Set<string>();
  const messages: ChatMessageLocal[] = [];
  for (const msg of [...apiMessages, ...streamingMessages]) {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      messages.push(msg);
    }
  }

  // WebSocket connection + handlers
  useEffect(() => {
    const ws = getWs();

    const unsubStatus = ws.onStatus((status) => setWsStatus(status));

    const unsubChunk = ws.on('chat:chunk', (data) => {
      const chunk = data as { content?: string; message_id?: string };
      if (chunk.content) {
        streamingContentRef.current += chunk.content;
        const content = streamingContentRef.current;
        const id = streamingIdRef.current;
        setStreamingMessages((prev) => {
          const existing = prev.find((m) => m.id === id);
          if (existing) {
            return prev.map((m) =>
              m.id === id ? { ...m, content } : m,
            );
          }
          return [
            ...prev,
            {
              id,
              content,
              role: 'assistant' as const,
              timestamp: new Date(),
              isStreaming: true,
            },
          ];
        });
      }
    });

    const unsubDone = ws.on('chat:done', () => {
      const id = streamingIdRef.current;
      setStreamingMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStreaming: false } : m,
        ),
      );
      streamingContentRef.current = '';
      streamingIdRef.current = '';
      setSendStreaming(false);
      if (activeSessionRef.current?.id) {
        void refreshMessages();
      }
    });

    const unsubError = ws.on('chat:error', (data) => {
      const error = data as { message?: string };
      setSendStreaming(false);
      streamingContentRef.current = '';
      streamingIdRef.current = '';
      Alert.alert(
        'Chat Error',
        error.message ?? 'An error occurred during streaming',
      );
    });

    const unsubCancelled = ws.on('chat:cancelled', () => {
      const id = streamingIdRef.current;
      setStreamingMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStreaming: false } : m,
        ),
      );
      streamingContentRef.current = '';
      streamingIdRef.current = '';
      setSendStreaming(false);
    });

    ws.connect();

    return () => {
      unsubStatus();
      unsubChunk();
      unsubDone();
      unsubError();
      unsubCancelled();
    };
  }, [refreshMessages]);

  useEffect(() => {
    return () => {
      getWs().disconnect();
    };
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const sessionId = activeSession?.id;
      if (!sessionId) {
        Alert.alert('Error', 'No active chat session');
        return;
      }

      const userMessage: ChatMessageLocal = {
        id: `temp-${Date.now()}`,
        content: content.trim(),
        role: 'user',
        timestamp: new Date(),
      };
      setStreamingMessages((prev) => [...prev, userMessage]);

      streamingIdRef.current = `stream-${Date.now()}`;
      streamingContentRef.current = '';
      setSendStreaming(true);

      getWs().send('chat:message', {
        session_id: sessionId,
        content: content.trim(),
      });
    },
    [activeSession?.id],
  );

  // Create new session
  const createSession = useCallback(
    async (title?: string) => {
      const result = await createSessionMutation.mutateAsync(title);
      if (result.data) {
        setActiveSession(result.data);
      }
      return result.data;
    },
    [createSessionMutation],
  );

  return {
    sessions: sessionsData?.data ?? [],
    sessionsLoading,
    sessionsError,
    activeSession,
    setActiveSession,
    messages,
    messagesLoading,
    messagesError,
    sendMessage,
    createSession,
    sendStreaming,
    wsStatus,
    refreshSessions,
    refreshMessages,
  };
}
