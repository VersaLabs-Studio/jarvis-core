// D6: Chat tab — thin wrapper that calls useChat() and renders the shared ChatView.
// The deep-link target (app/(tabs)/chat/session/[id].tsx) reuses the same ChatView
// with an initialSessionId so the deep-link opens the right session.

import { useChat } from '@/hooks/use-chat';
import { ChatView } from '@/components/chat-view';

export default function ChatScreen() {
  const chat = useChat();
  return <ChatView chat={chat} />;
}
