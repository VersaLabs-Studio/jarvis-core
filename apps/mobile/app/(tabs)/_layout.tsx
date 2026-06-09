import { Tabs } from "expo-router";
import { View, ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import {
  LayoutDashboard,
  MessageSquare,
  Workflow,
  Settings,
} from "lucide-react-native";

function TabBarIcon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: ColorValue;
  size?: number;
}) {
  const icons: Record<string, React.ComponentType<{ size?: number; color?: ColorValue }>> = {
    dashboard: LayoutDashboard,
    chat: MessageSquare,
    workflows: Workflow,
    settings: Settings,
  };

  const Icon = icons[name];
  return Icon ? <Icon size={size} color={color} /> : null;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtleForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit",
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <TabBarIcon name="chat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workflows"
        options={{
          title: "Workflows",
          tabBarIcon: ({ color }) => <TabBarIcon name="workflows" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
