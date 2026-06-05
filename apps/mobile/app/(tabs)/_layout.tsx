import { Tabs } from "expo-router";
import { View, ColorValue } from "react-native";
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
  const icons: Record<string, React.ComponentType<any>> = {
    dashboard: LayoutDashboard,
    chat: MessageSquare,
    workflows: Workflow,
    settings: Settings,
  };

  const Icon = icons[name];
  return Icon ? <Icon size={size} color={color} /> : null;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "oklch(0.65 0.15 250)", // accent
        tabBarInactiveTintColor: "oklch(0.65 0 0)", // muted-foreground
        tabBarStyle: {
          backgroundColor: "oklch(0.18 0 0)", // card
          borderTopColor: "oklch(0.3 0 0)", // border
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit",
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "oklch(0.145 0 0)", // background
        },
        headerTintColor: "oklch(0.93 0 0)", // foreground
        headerTitleStyle: {
          fontFamily: "Outfit",
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          headerTitle: "JARVIS",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <TabBarIcon name="chat" color={color} />,
          headerTitle: "Chat with JARVIS",
        }}
      />
      <Tabs.Screen
        name="workflows"
        options={{
          title: "Workflows",
          tabBarIcon: ({ color }) => <TabBarIcon name="workflows" color={color} />,
          headerTitle: "Workflows",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}
