import { View, Text, TextInput, FlatList } from "react-native";
import { useState, useRef, useCallback } from "react";
import { MotiView } from "moti";
import { Send, MessageSquare } from "lucide-react-native";
import { ScreenHeader } from "@/components/screen-header";
import { colors } from "@/theme/colors";
import { EmptyState, PressableScale } from "@/components/data-states";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

function ChatBubble({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === "user";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 200 }}
      className={`mb-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[80%] rounded-[20px] px-4 py-3 shadow-md ${
          isUser
            ? "bg-accent rounded-br-none"
            : "bg-card rounded-bl-none border border-hairline"
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
            isUser ? "text-accent-foreground font-medium" : "text-foreground"
          }`}
        >
          {message.content}
        </Text>
      </View>
      <Text className="text-subtle text-[11px] font-mono mt-1 px-2">
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </MotiView>
  );
}

function QuickCommandChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      className="bg-card-elevated border border-hairline rounded-full px-4.5 py-2 mr-2"
    >
      <Text className="text-foreground text-sm font-sans font-medium">{label}</Text>
    </PressableScale>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback((textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText("");

    // Mimic assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Operator command processed. Active agent pipeline responding to: "${text.trim()}".`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  }, [inputText]);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Chat" subtitle="Direct Connection to JARVIS Core" />

      {/* Quick Commands */}
      <View className="px-5 py-3 border-b border-hairline bg-background">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["/status", "/help", "/clear", "/history"]}
          renderItem={({ item }) => (
            <QuickCommandChip label={item} onPress={() => sendMessage(item)} />
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item, index }) => <ChatBubble message={item} index={index} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center mt-[25%]">
            <EmptyState
              title="Start a conversation"
              description="Ask JARVIS to run workflows, summarize metrics, or execute agent skills."
              icon={MessageSquare}
            />
          </View>
        }
      />

      {/* Input bar */}
      <View className="px-5 py-4 border-t border-hairline bg-card">
        <View className="flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-card-elevated border border-hairline rounded-2xl px-4 py-3 text-foreground font-sans text-base"
            placeholder="Message JARVIS..."
            placeholderTextColor={colors.subtleForeground}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <PressableScale
            onPress={() => sendMessage()}
            className="bg-accent rounded-2xl w-12 h-12 items-center justify-center shadow-lg"
            style={{
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Send size={20} color={colors.accentForeground} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
