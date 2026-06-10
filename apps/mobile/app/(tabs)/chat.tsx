// D4: Chat screen — real chat flow with streaming + session management

import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { MotiView } from 'moti';
import {
  Send,
  MessageSquare,
  Plus,
  ChevronLeft,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/screen-header';
import { colors } from '@/theme/colors';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  PressableScale,
} from '@/components/data-states';
import { useChat, type ChatMessageLocal } from '@/hooks/use-chat';
import type { ChatSession } from '@jarvis/shared';

// ---------------------------------------------------------------------------
// Chat Bubble
// ---------------------------------------------------------------------------

function ChatBubble({
  message,
  index,
}: {
  message: ChatMessageLocal;
  index: number;
}) {
  const isUser = message.role === 'user';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200, delay: index * 50 }}
      className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <View
        className={`max-w-[80%] rounded-[20px] px-4 py-3 shadow-md ${
          isUser
            ? 'bg-accent rounded-br-none'
            : 'bg-card-elevated rounded-bl-none border border-hairline'
        }`}
        style={{
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <Text
          className={`font-sans text-[15px] leading-5 ${
            isUser ? 'text-accent-foreground font-medium' : 'text-foreground'
          }`}
        >
          {message.content}
        </Text>
        {message.isStreaming && (
          <View className="mt-1">
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>
      <Text className="text-subtle text-[11px] font-mono mt-1 px-2">
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Quick Command Chip
// ---------------------------------------------------------------------------

function QuickCommandChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      className="bg-card-elevated border border-hairline rounded-full px-4 py-2 mr-2"
    >
      <Text className="text-foreground text-sm font-sans font-medium">
        {label}
      </Text>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Session Item
// ---------------------------------------------------------------------------

function SessionItem({
  session,
  isActive,
  onPress,
}: {
  session: ChatSession;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      className={`px-4 py-3 border-b border-hairline ${
        isActive ? 'bg-accent-subtle' : 'bg-transparent'
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-accent' : 'bg-muted'
          }`}
        />
        <View className="flex-1">
          <Text
            className={`text-sm font-sans font-medium ${
              isActive ? 'text-accent' : 'text-foreground'
            }`}
            numberOfLines={1}
          >
            {session.title || 'New Chat'}
          </Text>
          <Text className="text-subtle text-xs font-mono mt-0.5">
            {new Date(session.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loading States
// ---------------------------------------------------------------------------

function ChatSkeleton() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Chat" subtitle="Loading..." />
      <View className="px-5 py-3 border-b border-hairline bg-background">
        <Skeleton className="h-10 rounded-full w-48" />
      </View>
      <View className="p-5">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  );
}

function MessageListSkeleton() {
  return (
    <View className="p-5">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className={`mb-4 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}
        >
          <Skeleton
            className={`rounded-[20px] ${
              i % 2 === 0 ? 'w-2/3' : 'w-3/4'
            }`}
            height={60}
          />
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Session Picker Drawer
// ---------------------------------------------------------------------------

function SessionPicker({
  sessions,
  activeSession,
  onSelect,
  onNewSession,
  onClose,
}: {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onClose: () => void;
}) {
  return (
    <MotiView
      from={{ opacity: 0, transform: [{ translateX: -300 }] }}
      animate={{ opacity: 1, transform: [{ translateX: 0 }] }}
      exit={{ opacity: 0, transform: [{ translateX: -300 }] }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-background"
    >
      <View className="flex-1 pt-12">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-hairline">
          <PressableScale onPress={onClose} className="p-2">
            <ChevronLeft size={24} color={colors.foreground} />
          </PressableScale>
          <Text className="text-foreground text-lg font-sans font-semibold">
            Sessions
          </Text>
          <PressableScale onPress={onNewSession} className="p-2">
            <Plus size={24} color={colors.accent} />
          </PressableScale>
        </View>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionItem
              session={item}
              isActive={item.id === activeSession?.id}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No sessions yet"
              description="Create a new chat session to get started."
              icon={MessageSquare}
              action={
                <PressableScale
                  onPress={onNewSession}
                  className="bg-accent rounded-xl px-5 py-2.5"
                >
                  <Text className="text-accent-foreground text-sm font-sans font-medium">
                    New Chat
                  </Text>
                </PressableScale>
              }
            />
          }
        />
      </View>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Screen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const {
    sessions,
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
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-select first session if none selected
  useEffect(() => {
    if (!sessionsLoading && sessions.length > 0 && !activeSession) {
      setActiveSession(sessions[0]);
    }
  }, [sessions, sessionsLoading, activeSession, setActiveSession]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = textToSend || inputText;
      if (!text.trim()) return;
      if (!textToSend) setInputText('');
      await sendMessage(text);
    },
    [inputText, sendMessage],
  );

  const handleCreateSession = useCallback(async () => {
    const session = await createSession('New Chat');
    if (session) {
      setActiveSession(session);
    }
  }, [createSession, setActiveSession]);

  const quickCommands = ['/status', '/help', '/clear', '/history'];

  // Loading state
  if (sessionsLoading) {
    return <ChatSkeleton />;
  }

  // Error state
  if (sessionsError) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Chat" />
        <ErrorState
          title="Failed to load sessions"
          description={sessionsError.message ?? 'An error occurred'}
          onRetry={refreshSessions}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Chat"
        subtitle={activeSession?.title ?? 'Direct Connection to JARVIS Core'}
        rightAction={
          <View className="flex-row items-center gap-3">
            <View
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-success'
                  : wsStatus === 'connecting'
                    ? 'bg-warning'
                    : 'bg-destructive'
              }`}
            />
            <PressableScale
              onPress={() => setShowSessionPicker(true)}
              className="p-2 bg-card-elevated rounded-xl border border-hairline"
            >
              <MessageSquare size={18} color={colors.foreground} />
            </PressableScale>
          </View>
        }
      />

      {showSessionPicker && (
        <SessionPicker
          sessions={sessions}
          activeSession={activeSession}
          onSelect={setActiveSession}
          onNewSession={handleCreateSession}
          onClose={() => setShowSessionPicker(false)}
        />
      )}

      {/* Quick Commands */}
      <View className="px-5 py-3 border-b border-hairline bg-background">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickCommands}
          renderItem={({ item }) => (
            <QuickCommandChip label={item} onPress={() => handleSend(item)} />
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Messages */}
      {messagesLoading ? (
        <MessageListSkeleton />
      ) : messagesError ? (
        <ErrorState
          title="Failed to load messages"
          description={messagesError.message ?? 'An error occurred'}
          onRetry={refreshMessages}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item, index }) => (
            <ChatBubble message={item} index={index} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          refreshControl={
            <RefreshControl
              refreshing={messagesLoading}
              onRefresh={refreshMessages}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center mt-[25%]">
              <EmptyState
                title="Start a conversation"
                description="Ask JARVIS to run workflows, summarize metrics, or execute agent skills."
                icon={MessageSquare}
                action={
                  !activeSession ? (
                    <PressableScale
                      onPress={handleCreateSession}
                      className="bg-accent rounded-xl px-5 py-2.5"
                    >
                      <Text className="text-accent-foreground text-sm font-sans font-medium">
                        New Chat
                      </Text>
                    </PressableScale>
                  ) : undefined
                }
              />
            </View>
          }
          ListFooterComponent={
            sendStreaming ? (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                className="items-start mb-4"
              >
                <View className="bg-card-elevated rounded-[20px] rounded-bl-none border border-hairline px-4 py-3">
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              </MotiView>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <View className="px-5 py-4 border-t border-hairline bg-card">
        <View className="flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-card-elevated border border-hairline rounded-2xl px-4 py-3 text-foreground font-sans text-base"
            placeholder="Message JARVIS..."
            placeholderTextColor={colors.subtleForeground}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={!sendStreaming}
          />
          <PressableScale
            onPress={() => handleSend()}
            disabled={sendStreaming || !inputText.trim()}
            className={`rounded-2xl w-12 h-12 items-center justify-center shadow-lg ${
              sendStreaming || !inputText.trim() ? 'bg-muted' : 'bg-accent'
            }`}
            style={{
              shadowColor: sendStreaming ? colors.shadow : colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: sendStreaming ? 0.1 : 0.2,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {sendStreaming ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Send size={20} color={colors.accentForeground} />
            )}
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
