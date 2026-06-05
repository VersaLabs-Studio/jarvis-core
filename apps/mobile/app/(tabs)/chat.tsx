import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useState, useRef, useCallback } from "react";
import { MotiView } from "moti";
import { Send } from "lucide-react-native";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 200 }}
      className={`mb-3 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-accent rounded-br-md"
            : "bg-card rounded-bl-md border border-border"
        }`}
      >
        <Text
          className={`font-sans text-[15px] leading-5 ${
            isUser ? "text-accent-foreground" : "text-foreground"
          }`}
        >
          {message.content}
        </Text>
      </View>
      <Text className="text-muted-foreground text-xs font-sans mt-1 px-2">
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </MotiView>
  );
}

function QuickCommandChip({ label }: { label: string }) {
  return (
    <Pressable className="bg-muted rounded-full px-4 py-2 mr-2">
      <Text className="text-foreground text-sm font-sans">{label}</Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // TODO: Send to WS and get response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I received your message. This is a placeholder response.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  }, [inputText]);

  return (
    <View className="flex-1 bg-background">
      {/* Quick Commands */}
      <View className="px-4 py-3 border-b border-border">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["Status", "Help", "Clear", "History"]}
          renderItem={({ item }) => <QuickCommandChip label={item} />}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <ChatBubble message={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-muted-foreground font-sans text-lg">
              Start a conversation
            </Text>
            <Text className="text-muted-foreground font-sans text-sm mt-2">
              Ask JARVIS anything
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View className="px-4 py-3 border-t border-border bg-card">
        <View className="flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-muted rounded-xl px-4 py-3 text-foreground font-sans"
            placeholder="Message JARVIS..."
            placeholderTextColor="oklch(0.5 0 0)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable
            onPress={sendMessage}
            className="bg-accent rounded-xl w-12 h-12 items-center justify-center"
          >
            <Send size={20} color="oklch(0.15 0 0)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
