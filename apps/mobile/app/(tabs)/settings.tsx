import { View, Text, Switch, Pressable, ScrollView } from "react-native";
import { useState, useCallback } from "react";
import { MotiView } from "moti";
import {
  Server,
  Bell,
  Moon,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

interface SettingItemProps {
  icon: React.ComponentType<any>;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

function SettingItem({
  icon: Icon,
  label,
  description,
  right,
  onPress,
}: SettingItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-4 px-4 border-b border-border"
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-lg bg-muted items-center justify-center mr-3">
          <Icon size={20} color="oklch(0.93 0 0)" />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-sans text-base">{label}</Text>
          {description && (
            <Text className="text-muted-foreground font-sans text-sm mt-0.5">
              {description}
            </Text>
          )}
        </View>
      </View>
      {right || <ChevronRight size={20} color="oklch(0.65 0 0)" />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);

  const handleLogout = useCallback(() => {
    // TODO: Implement logout with SecureStore clear
    console.log("Logout");
  }, []);

  return (
    <ScrollView className="flex-1 bg-background">
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 300 }}
      >
        {/* Server Section */}
        <View className="mt-4">
          <Text className="text-muted-foreground text-sm font-sans px-4 mb-2">
            CONNECTION
          </Text>
          <View className="bg-card border border-border rounded-lg mx-4">
            <SettingItem
              icon={Server}
              label="Server URL"
              description="http://localhost:4000"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Preferences */}
        <View className="mt-6">
          <Text className="text-muted-foreground text-sm font-sans px-4 mb-2">
            PREFERENCES
          </Text>
          <View className="bg-card border border-border rounded-lg mx-4">
            <SettingItem
              icon={Bell}
              label="Notifications"
              description="Push notifications for events"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{
                    false: "oklch(0.25 0 0)",
                    true: "oklch(0.65 0.15 250)",
                  }}
                  thumbColor="oklch(0.93 0 0)"
                />
              }
            />
            <SettingItem
              icon={Moon}
              label="Theme"
              description="Dark (v1.5)"
              right={
                <Text className="text-muted-foreground font-sans">Dark</Text>
              }
            />
          </View>
        </View>

        {/* About */}
        <View className="mt-6">
          <Text className="text-muted-foreground text-sm font-sans px-4 mb-2">
            ABOUT
          </Text>
          <View className="bg-card border border-border rounded-lg mx-4">
            <SettingItem
              icon={Info}
              label="Version"
              description="JARVIS v1.5.0"
              right={
                <Text className="text-muted-foreground font-sans">1.5.0</Text>
              }
            />
          </View>
        </View>

        {/* Logout */}
        <View className="mt-6 mb-8">
          <View className="bg-card border border-border rounded-lg mx-4">
            <SettingItem
              icon={LogOut}
              label="Logout"
              description="Sign out of your account"
              onPress={handleLogout}
            />
          </View>
        </View>
      </MotiView>
    </ScrollView>
  );
}
