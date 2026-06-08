import { View, Text, FlatList, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { MotiView } from "moti";
import { ScreenHeader } from "@/components/screen-header";
import { colors } from "@/theme/colors";
import { EmptyState, PressableScale } from "@/components/data-states";
import { Workflow as WorkflowIcon } from "lucide-react-native";

interface Workflow {
  id: string;
  name: string;
  status: "active" | "inactive" | "running" | "failed";
  lastRun?: Date;
  triggerCount: number;
}

function StatusBadge({ status }: { status: Workflow["status"] }) {
  if (status === "active") {
    return (
      <View className="flex-row items-center gap-1.5 bg-success-subtle rounded-full px-2.5 py-1 border border-hairline">
        <View className="w-2 h-2 rounded-full bg-success" />
        <Text className="text-xs font-sans font-semibold text-success">Active</Text>
      </View>
    );
  }
  if (status === "running") {
    return (
      <View className="flex-row items-center gap-1.5 bg-accent-subtle rounded-full px-2.5 py-1 border border-hairline">
        <MotiView
          from={{ opacity: 0.4, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 800, loop: true }}
          className="w-2 h-2 rounded-full bg-accent"
        />
        <Text className="text-xs font-sans font-semibold text-accent">Running</Text>
      </View>
    );
  }
  if (status === "failed") {
    return (
      <View className="flex-row items-center gap-1.5 bg-destructive-subtle rounded-full px-2.5 py-1 border border-hairline">
        <View className="w-2 h-2 rounded-full bg-destructive" />
        <Text className="text-xs font-sans font-semibold text-destructive">Failed</Text>
      </View>
    );
  }
  // inactive
  return (
    <View className="flex-row items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 border border-hairline">
      <View className="w-2 h-2 rounded-full bg-subtle" />
      <Text className="text-xs font-sans font-semibold text-subtle">Inactive</Text>
    </View>
  );
}

interface WorkflowCardProps {
  workflow: Workflow;
  onTrigger: (id: string) => void;
  index: number;
}

function WorkflowCard({
  workflow,
  onTrigger,
  index,
}: WorkflowCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, delay: index * 45 }}
      className="bg-card rounded-[20px] border border-hairline p-5 mb-4 shadow-lg"
      style={{
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 pr-3">
          <Text className="text-foreground text-lg font-sans font-semibold">
            {workflow.name}
          </Text>
          {workflow.lastRun && (
            <Text className="text-muted-foreground text-[13px] font-sans mt-1">
              Last run: {workflow.lastRun.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </Text>
          )}
        </View>
        <StatusBadge status={workflow.status} />
      </View>

      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-muted-foreground text-[13px] font-sans">
          <Text className="font-mono text-foreground font-semibold">{workflow.triggerCount}</Text> triggers
        </Text>
        <PressableScale
          onPress={() => onTrigger(workflow.id)}
          className="border border-accent rounded-xl px-5 py-2.5 bg-transparent"
        >
          <Text className="text-accent text-sm font-sans font-medium">
            Trigger
          </Text>
        </PressableScale>
      </View>
    </MotiView>
  );
}

export default function WorkflowsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [workflows] = useState<Workflow[]>([
    {
      id: "1",
      name: "Daily Report Generation",
      status: "active",
      lastRun: new Date(),
      triggerCount: 24,
    },
    {
      id: "2",
      name: "Data Synchronization Pipeline",
      status: "inactive",
      triggerCount: 0,
    },
    {
      id: "3",
      name: "Email Digest Automator",
      status: "running",
      lastRun: new Date(),
      triggerCount: 12,
    },
    {
      id: "4",
      name: "Database Backup Task",
      status: "failed",
      lastRun: new Date(Date.now() - 86400000),
      triggerCount: 8,
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const triggerWorkflow = useCallback((id: string) => {
    console.log("Trigger workflow:", id);
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Workflows" subtitle="Automated pipeline configurations" />

      <FlatList
        data={workflows}
        renderItem={({ item, index }) => (
          <WorkflowCard workflow={item} onTrigger={triggerWorkflow} index={index} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center mt-[25%]">
            <EmptyState
              title="No workflows configured"
              description="Configure pipelines and automations using the JARVIS web interface."
              icon={WorkflowIcon}
            />
          </View>
        }
      />
    </View>
  );
}
