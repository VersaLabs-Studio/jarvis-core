import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { MotiView } from "moti";
import { Play, CheckCircle, Clock, AlertCircle } from "lucide-react-native";

interface Workflow {
  id: string;
  name: string;
  status: "active" | "inactive" | "running" | "failed";
  lastRun?: Date;
  triggerCount: number;
}

function StatusBadge({ status }: { status: Workflow["status"] }) {
  const config = {
    active: { color: "bg-accent", icon: CheckCircle, label: "Active" },
    inactive: { color: "bg-muted", icon: Clock, label: "Inactive" },
    running: { color: "bg-accent", icon: Play, label: "Running" },
    failed: { color: "bg-destructive", icon: AlertCircle, label: "Failed" },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <View className={`flex-row items-center gap-1 ${color} rounded-full px-2 py-1`}>
      <Icon size={12} color="oklch(0.93 0 0)" />
      <Text className="text-xs font-sans text-foreground">{label}</Text>
    </View>
  );
}

function WorkflowCard({
  workflow,
  onTrigger,
}: {
  workflow: Workflow;
  onTrigger: (id: string) => void;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 200 }}
      className="bg-card rounded-lg border border-border p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-foreground text-lg font-sans font-semibold">
            {workflow.name}
          </Text>
          {workflow.lastRun && (
            <Text className="text-muted-foreground text-sm font-sans mt-1">
              Last run: {workflow.lastRun.toLocaleDateString()}
            </Text>
          )}
        </View>
        <StatusBadge status={workflow.status} />
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-muted-foreground text-sm font-sans">
          {workflow.triggerCount} triggers
        </Text>
        <Pressable
          onPress={() => onTrigger(workflow.id)}
          className="bg-accent rounded-lg px-4 py-2"
        >
          <Text className="text-accent-foreground text-sm font-sans font-medium">
            Trigger
          </Text>
        </Pressable>
      </View>
    </MotiView>
  );
}

export default function WorkflowsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [workflows] = useState<Workflow[]>([
    {
      id: "1",
      name: "Daily Report",
      status: "active",
      lastRun: new Date(),
      triggerCount: 24,
    },
    {
      id: "2",
      name: "Data Sync",
      status: "inactive",
      triggerCount: 0,
    },
    {
      id: "3",
      name: "Email Digest",
      status: "running",
      lastRun: new Date(),
      triggerCount: 12,
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Refetch workflows
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const triggerWorkflow = useCallback((id: string) => {
    // TODO: Trigger workflow via API
    console.log("Trigger workflow:", id);
  }, []);

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={workflows}
        renderItem={({ item }) => (
          <WorkflowCard workflow={item} onTrigger={triggerWorkflow} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-muted-foreground font-sans text-lg">
              No workflows
            </Text>
            <Text className="text-muted-foreground font-sans text-sm mt-2">
              Create workflows in the web dashboard
            </Text>
          </View>
        }
      />
    </View>
  );
}
