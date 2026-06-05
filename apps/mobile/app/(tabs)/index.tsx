import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { MotiView } from "moti";

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 300 }}
      className="bg-card rounded-lg p-4 border border-border"
    >
      <Text className="text-muted-foreground text-sm font-sans">{title}</Text>
      <Text className="text-foreground text-2xl font-sans font-bold mt-1">
        {value}
      </Text>
      {subtitle && (
        <Text className="text-muted-foreground text-xs font-sans mt-1">
          {subtitle}
        </Text>
      )}
    </MotiView>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Refetch data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
      >
        <Text className="text-foreground text-xl font-sans font-semibold mb-4">
          Overview
        </Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%]">
            <StatCard title="Services" value="5" subtitle="3 active" />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatCard title="Models" value="3" subtitle="2 connected" />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatCard title="Workflows" value="12" subtitle="8 successful" />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatCard title="Messages" value="142" subtitle="Today" />
          </View>
        </View>

        <Text className="text-foreground text-xl font-sans font-semibold mb-4">
          Recent Activity
        </Text>

        {/* TODO: Activity list */}
        <View className="bg-card rounded-lg border border-border p-4">
          <Text className="text-muted-foreground font-sans">
            No recent activity
          </Text>
        </View>
      </MotiView>
    </ScrollView>
  );
}
