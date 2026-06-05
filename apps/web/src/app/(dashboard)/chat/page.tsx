"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { ChatSession, ChatMessage, ChatMessageRole } from "@jarvis/shared";
import { keys } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useList } from "@/hooks/use-entity";
import {
  Skeleton,
  EmptyState,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages, useChatStream } from "./_hooks/use-chat";

const roleVariant: Record<ChatMessageRole, "default" | "secondary" | "info" | "warning"> = {
  user: "default",
  assistant: "info",
  system: "warning",
  tool: "secondary",
};

export default function ChatPage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessions = useList<ChatSession>("chat_sessions");
  const messages = useChatMessages(activeSession ?? "");
  const { sendMessage, cancel, chunks, streaming, wsStatus } = useChatStream();

  const sessionList = sessions.data?.data ?? [];
  const messageList = messages.data?.data ?? [];

  const displayMessages = useMemo(() => {
    if (chunks.length === 0) return messageList;
    const assistantMsg: ChatMessage = {
      id: "streaming",
      session_id: activeSession ?? "",
      tenant_id: "",
      role: "assistant",
      content: chunks.join(""),
      model: null,
      tools_used: [],
      tokens_in: null,
      tokens_out: null,
      duration_ms: null,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    return [...messageList, assistantMsg];
  }, [messageList, chunks, activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSend = () => {
    if (!input.trim() || !activeSession || streaming) return;
    sendMessage(activeSession, input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (sessions.isLoading) {
    return <ChatSkeleton />;
  }

  if (sessions.isError) {
    return (
      <ErrorState
        title="Failed to load chats"
        description={sessions.error?.message ?? "Could not load chat sessions."}
        onRetry={() => sessions.refetch()}
      />
    );
  }

  return (
    <DataView className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Session List */}
      <motion.div variants={itemVariants} className="w-64 shrink-0">
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl h-full flex flex-col">
          <div className="p-3 border-b border-border/50">
            <h2 className="text-sm font-semibold">Sessions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No sessions yet
              </p>
            ) : (
              sessionList.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeSession === session.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <p className="font-medium truncate">{session.title}</p>
                  <p className="text-xs opacity-70">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Chat Area */}
      <motion.div variants={itemVariants} className="flex-1 flex flex-col min-w-0">
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Select a session"
              description="Choose a chat session from the sidebar to start messaging."
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">
                  {sessionList.find((s) => s.id === activeSession)?.title ?? "Chat"}
                </h3>
                <Badge variant={
                  wsStatus === "connected" ? "success" :
                  wsStatus === "connecting" ? "warning" :
                  "error"
                }>
                  {wsStatus}
                </Badge>
              </div>
              {streaming && (
                <Button variant="outline" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl p-4 space-y-4">
              {messages.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-3/4 rounded-lg" />
                  ))}
                </div>
              ) : displayMessages.length === 0 ? (
                <EmptyState
                  title="No messages"
                  description="Send a message to start the conversation."
                />
              ) : (
                displayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={roleVariant[msg.role] ?? "secondary"} className="text-[10px]">
                          {msg.role}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="mt-4 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={streaming || wsStatus !== "connected"}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || streaming || wsStatus !== "connected"}
              >
                {streaming ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </DataView>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <div className="w-64 shrink-0 rounded-xl border border-border/50 bg-card/80">
        <div className="p-3 border-b border-border/50">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="p-2 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="flex-1 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
