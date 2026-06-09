import { View, Text, Switch, ScrollView } from "react-native";
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
import { ScreenHeader } from "@/components/screen-header";
import { colors } from "@/theme/colors";
import { PressableScale } from "@/components/data-states";

interface SettingItemProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  iconBg: string;
  iconColor: string;
}

function SettingItem({
  icon: Icon,
  label,
  description,
  right,
  onPress,
  iconBg,
  iconColor,
}: SettingItemProps) {
  return (
    <PressableScale
      onPress={onPress}
      className="flex-row items-center justify-between py-4.5 px-4"
    >
      <View className="flex-row items-center flex-1">
        <View
          style={{ backgroundColor: iconBg }}
          className="w-10 h-10 rounded-xl items-center justify-center mr-3 border border-hairline"
        >
          <Icon size={18} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-sans text-base font-semibold">{label}</Text>
          {description && (
            <Text className="text-muted-foreground font-sans text-[13px] mt-0.5">
              {description}
            </Text>
          )}
        </View>
      </View>
      {right === undefined ? (
        <ChevronRight size={18} color={colors.subtleForeground} />
      ) : (
        right
      )}
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);

  const handleLogout = useCallback(() => {
    console.log("Logout triggered");
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Settings" subtitle="Console configuration & limits" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 300 }}
        >
          {/* Server Section */}
          <View className="mt-6">
            <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase px-5 mb-2">
              Connection
            </Text>
            <View
              className="bg-card border border-hairline rounded-[20px] mx-5 overflow-hidden shadow-lg"
              style={{
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <SettingItem
                icon={Server}
                label="Server URL"
                description="http://localhost:4000"
                iconBg={colors.accentSubtle}
                iconColor={colors.accent}
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Preferences */}
          <View className="mt-6">
            <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase px-5 mb-2">
              Preferences
            </Text>
            <View
              className="bg-card border border-hairline rounded-[20px] mx-5 overflow-hidden shadow-lg"
              style={{
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <SettingItem
                icon={Bell}
                label="Notifications"
                description="Push notifications for active alerts"
                iconBg={colors.accentSubtle}
                iconColor={colors.accent}
                right={
                  <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    trackColor={{
                      false: colors.overlay,
                      true: colors.accent,
                    }}
                    thumbColor={colors.foreground}
                  />
                }
              />
              <View className="h-[1px] bg-hairline" />
              <SettingItem
                icon={Moon}
                label="Theme"
                description="Dark (v1.5 Premium)"
                iconBg={colors.accentSubtle}
                iconColor={colors.accent}
                right={
                  <Text className="text-muted-foreground font-sans text-sm mr-2">Dark</Text>
                }
              />
            </View>
          </View>

          {/* About */}
          <View className="mt-6">
            <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase px-5 mb-2">
              About
            </Text>
            <View
              className="bg-card border border-hairline rounded-[20px] mx-5 overflow-hidden shadow-lg"
              style={{
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <SettingItem
                icon={Info}
                label="Version"
                description="JARVIS v1.5.0 (Expo)"
                iconBg={colors.overlay}
                iconColor={colors.subtleForeground}
                right={
                  <Text className="text-muted-foreground font-mono text-sm mr-2">1.5.0</Text>
                }
              />
            </View>
          </View>

          {/* Logout */}
          <View className="mt-8 mb-8">
            <View
              className="bg-card border border-hairline rounded-[20px] mx-5 overflow-hidden shadow-lg"
              style={{
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <SettingItem
                icon={LogOut}
                label="Logout"
                description="Sign out of operators dashboard"
                iconBg={colors.dangerSubtle}
                iconColor={colors.danger}
                right={<View />}
                onPress={handleLogout}
              />
            </View>
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}
