import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { MotiView } from "moti";
import { ScreenHeader } from "@/components/screen-header";
import { colors } from "@/theme/colors";
import { Server, Cpu, Workflow, MessageSquare, CheckCircle } from "lucide-react-native";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  index: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  index,
}: StatCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, delay: index * 45 }}
      className="bg-card rounded-[20px] border border-hairline p-5 shadow-lg flex-1 min-w-[45%]"
      style={{
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase">
          {title}
        </Text>
        <View className="w-8 h-8 rounded-lg bg-accent-subtle items-center justify-center">
          <Icon size={16} color={colors.accent} />
        </View>
      </View>

      <Text className="text-foreground text-3xl font-mono font-bold mt-1">
        {value}
      </Text>

      {subtitle && (
        <View className="flex-row items-center mt-2">
          <View className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
          <Text className="text-muted-foreground text-xs font-sans">
            {subtitle}
          </Text>
        </View>
      )}
    </MotiView>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" subtitle="JARVIS v1.5 Operator Console" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 320 }}
        >
          <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
            System Overview
          </Text>

          <View className="flex-row flex-wrap gap-4 mb-6">
            <StatCard title="Services" value="5" subtitle="3 active" icon={Server} index={0} />
            <StatCard title="Models" value="3" subtitle="2 connected" icon={Cpu} index={1} />
            <StatCard title="Workflows" value="12" subtitle="8 successful" icon={Workflow} index={2} />
            <StatCard title="Messages" value="142" subtitle="Today" icon={MessageSquare} index={3} />
          </View>

          <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
            Recent Activity
          </Text>

          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300, delay: 4 * 45 }}
            className="bg-card rounded-[20px] border border-hairline p-5 shadow-lg"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-overlay items-center justify-center border border-hairline">
                <CheckCircle size={18} color={colors.success} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-sans font-semibold">
                  All systems operational
                </Text>
                <Text className="text-muted-foreground text-xs font-sans mt-0.5">
                  No recent errors or warnings detected
                </Text>
              </View>
            </View>
          </MotiView>
        </MotiView>
      </ScrollView>
    </View>
  );
}
