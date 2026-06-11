import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ScreenHeader } from "@/components/screen-header";
import { colors } from "@/theme/colors";
import { Skeleton, EmptyState, ErrorState, PressableScale } from "@/components/data-states";
import { useList } from "@/hooks/use-entity";
import { api } from "@/lib/api";
import {
  Server,
  Cpu,
  Workflow,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
} from "lucide-react-native";
import type { Workflow as WorkflowType } from "@jarvis/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceHealth {
  name: string;
  status: "running" | "stopped" | "error" | "provisioning" | "terminated";
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useServiceHealth() {
  return useQuery<ServiceHealth[]>({
    queryKey: ["services", "health"],
    queryFn: () => api.getRaw<ServiceHealth[]>("/api/services"),
  });
}

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

function StatCardSkeleton({ index }: { index: number }) {
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
      <Skeleton className="h-3 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  index: number;
}

function StatCard({ title, value, subtitle, icon: Icon, index }: StatCardProps) {
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

// ---------------------------------------------------------------------------
// Health row
// ---------------------------------------------------------------------------

function ServiceHealthRow({ service, index }: { service: ServiceHealth; index: number }) {
  const isRunning = service.status === "running";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 250, delay: index * 40 }}
      className="flex-row items-center justify-between py-3 px-4"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className={`w-2 h-2 rounded-full ${isRunning ? "bg-success" : "bg-danger"}`}
        />
        <Text className="text-foreground text-sm font-sans font-medium flex-1">
          {service.name}
        </Text>
      </View>
      <View
        className={`rounded-full px-2.5 py-1 border border-hairline ${
          isRunning ? "bg-success-subtle" : "bg-danger-subtle"
        }`}
      >
        <Text
          className={`text-xs font-sans font-semibold ${
            isRunning ? "text-success" : "text-danger"
          }`}
        >
          {service.status}
        </Text>
      </View>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const queryClient = useQueryClient();

  const workflows = useList<WorkflowType>("workflows");
  const chatSessions = useList("chat_sessions");
  const serviceHealth = useServiceHealth();

  const isLoading = workflows.isLoading || chatSessions.isLoading || serviceHealth.isLoading;
  const isError = workflows.isError || chatSessions.isError || serviceHealth.isError;
  const error = workflows.error || chatSessions.error || serviceHealth.error;

  const onRefresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workflows"] }),
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["services", "health"] }),
    ]);
  };

  const runningCount = useMemo(() => {
    if (!serviceHealth.data) return 0;
    return serviceHealth.data.filter((s) => s.status === "running").length;
  }, [serviceHealth.data]);

  // --- Skeleton ---
  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Dashboard" subtitle="JARVIS v1.5 Operator Console" />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
            System Overview
          </Text>
          <View className="flex-row flex-wrap gap-4 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <StatCardSkeleton key={i} index={i} />
            ))}
          </View>
          <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
            Service Health
          </Text>
          <View className="bg-card rounded-[20px] border border-hairline overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 mx-4 my-3" />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Error ---
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Dashboard" subtitle="JARVIS v1.5 Operator Console" />
        <ErrorState
          title="Failed to load dashboard"
          description={error instanceof Error ? error.message : "An unexpected error occurred."}
          onRetry={onRefresh}
        />
      </View>
    );
  }

  const workflowCount = workflows.data?.data?.length ?? 0;
  const sessionCount = chatSessions.data?.total ?? chatSessions.data?.data?.length ?? 0;
  const servicesTotal = serviceHealth.data?.length ?? 0;

  // --- Empty ---
  if (workflowCount === 0 && servicesTotal === 0) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Dashboard" subtitle="JARVIS v1.5 Operator Console" />
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={workflows.isFetching}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <EmptyState
            title="No data yet"
            description="Create workflows or configure services to see your dashboard overview."
            icon={Cpu}
            action={
              <PressableScale onPress={onRefresh} className="border border-accent rounded-xl px-5 py-2.5 bg-transparent">
                <Text className="text-accent text-sm font-sans font-medium">Refresh</Text>
              </PressableScale>
            }
          />
        </ScrollView>
      </View>
    );
  }

  // --- Loaded ---
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" subtitle="JARVIS v1.5 Operator Console" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={workflows.isFetching}
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
          {/* --- Stat cards --- */}
          <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
            System Overview
          </Text>

          <View className="flex-row flex-wrap gap-4 mb-6">
            <StatCard
              title="Services"
              value={String(servicesTotal)}
              subtitle={`${runningCount} active`}
              icon={Server}
              index={0}
            />
            <StatCard
              title="Workflows"
              value={String(workflowCount)}
              subtitle="total"
              icon={Workflow}
              index={1}
            />
            <StatCard
              title="Sessions"
              value={String(sessionCount)}
              subtitle="chat"
              icon={MessageSquare}
              index={2}
            />
            <StatCard
              title="Models"
              value="—"
              subtitle="connected"
              icon={Cpu}
              index={3}
            />
          </View>

          {/* --- Service health --- */}
          {servicesTotal > 0 && (
            <>
              <Text className="text-muted-foreground text-xs font-sans font-semibold tracking-[0.8px] uppercase mb-4">
                Service Health
              </Text>

              <View
                className="bg-card rounded-[20px] border border-hairline overflow-hidden shadow-lg mb-6"
                style={{
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 3,
                }}
              >
                {serviceHealth.data!.map((svc, i) => (
                  <View key={svc.name}>
                    <ServiceHealthRow service={svc} index={i} />
                    {i < serviceHealth.data!.length - 1 && (
                      <View className="h-[1px] bg-hairline ml-4" />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* --- Recent activity --- */}
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
                {runningCount === servicesTotal ? (
                  <CheckCircle size={18} color={colors.success} />
                ) : (
                  <AlertTriangle size={18} color={colors.warning} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-sans font-semibold">
                  {runningCount === servicesTotal
                    ? "All systems operational"
                    : `${runningCount}/${servicesTotal} services running`}
                </Text>
                <Text className="text-muted-foreground text-xs font-sans mt-0.5">
                  {runningCount === servicesTotal
                    ? "No recent errors or warnings detected"
                    : "Some services may need attention"}
                </Text>
              </View>
            </View>
          </MotiView>
        </MotiView>
      </ScrollView>
    </View>
  );
}
