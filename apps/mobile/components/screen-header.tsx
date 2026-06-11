import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenHeader({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 16) }}
      className="bg-background border-b border-hairline px-5 pb-4"
    >
      <View className="flex-row justify-between items-end">
        <View className="flex-1 pr-4">
          <Text className="text-foreground text-[28px] font-sans font-semibold tracking-[-0.5px]">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-muted-foreground text-[13px] font-sans mt-0.5">
              {subtitle}
            </Text>
          )}
        </View>
        {rightAction && <View className="pb-1">{rightAction}</View>}
      </View>
    </View>
  );
}
