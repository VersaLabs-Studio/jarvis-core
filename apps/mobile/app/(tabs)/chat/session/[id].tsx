// D6: Deep-link target — `jarvis://chat/session/:id` resolves here.
// Uses the same ChatView as the chat tab, with the session pre-selected.

import { useLocalSearchParams } from 'expo-router';
import { useChat } from '@/hooks/use-chat';
import { ChatView } from '@/components/chat-view';

export default function ChatSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useChat(id ?? null);
  return <ChatView chat={chat} />;
}
