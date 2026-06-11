import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { MotiView } from 'moti';
import { ScreenHeader } from '@/components/screen-header';
import { colors } from '@/theme/colors';
import { EmptyState, ErrorState, PressableScale, SkeletonCard } from '@/components/data-states';
import { Workflow as WorkflowIcon, Play } from 'lucide-react-native';
import type { Workflow, WorkflowRun } from '@jarvis/shared';
import { useList } from '@/hooks/use-entity';
import { useWorkflowRunsBatched } from '@/hooks/use-workflow-runs-batched';
import { haptics } from '@/lib/haptics';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Status badge — maps workflow_status → premium pill
// ---------------------------------------------------------------------------

type WorkflowStatus = Workflow['status'];

const STATUS_META: Record<
  WorkflowStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  active: { label: 'Active', dot: 'bg-success', bg: 'bg-success-subtle', text: 'text-success' },
  draft: { label: 'Draft', dot: 'bg-subtle', bg: 'bg-muted', text: 'text-subtle' },
  paused: { label: 'Paused', dot: 'bg-warning', bg: 'bg-warning-subtle', text: 'text-warning' },
  archived: { label: 'Archived', dot: 'bg-subtle', bg: 'bg-muted', text: 'text-subtle' },
};

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;

  return (
    <View className={`flex-row items-center gap-1.5 ${meta.bg} rounded-full px-2.5 py-1 border border-hairline`}>
      <View className={`w-2 h-2 rounded-full ${meta.dot}`} />
      <Text className={`text-xs font-sans font-semibold ${meta.text}`}>{meta.label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Run badge — shows latest run status inline
// ---------------------------------------------------------------------------

function RunBadge({ run }: { run: WorkflowRun | undefined }) {
  if (!run) return null;

  const meta =
    run.status === 'success'
      ? { label: 'Last run ok', color: 'text-success' }
      : run.status === 'failed'
        ? { label: 'Last run failed', color: 'text-destructive' }
        : run.status === 'running'
          ? { label: 'Running…', color: 'text-accent' }
          : null;

  if (!meta) return null;

  return (
    <Text className={`text-[11px] font-sans mt-1 ${meta.color}`}>{meta.label}</Text>
  );
}

// ---------------------------------------------------------------------------
// Workflow Card — uses run data passed from parent
// ---------------------------------------------------------------------------

interface WorkflowCardProps {
  workflow: Workflow;
  latestRun?: WorkflowRun;
  runCount: number;
  onTrigger: (id: string) => void;
  index: number;
}

function WorkflowCard({
  workflow,
  latestRun,
  runCount,
  onTrigger,
  index,
}: WorkflowCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 45 }}
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
          <Text className="text-foreground text-lg font-sans font-semibold">{workflow.name}</Text>
          {workflow.description ? (
            <Text className="text-muted-foreground text-[13px] font-sans mt-0.5" numberOfLines={1}>
              {workflow.description}
            </Text>
          ) : null}
          {latestRun && <RunBadge run={latestRun} />}
        </View>
        <StatusBadge status={workflow.status} />
      </View>

      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-muted-foreground text-[13px] font-sans">
          <Text className="font-mono text-foreground font-semibold">{runCount}</Text> runs
        </Text>
        <PressableScale
          onPress={() => onTrigger(workflow.id)}
          className="flex-row items-center gap-1.5 border border-accent rounded-xl px-4 py-2 bg-accent-subtle"
        >
          <Play size={14} color={colors.accent} />
          <Text className="text-accent text-sm font-sans font-medium">Trigger</Text>
        </PressableScale>
      </View>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Workflow Card with run data (lazy-loads runs per card)
// ---------------------------------------------------------------------------

function WorkflowCardWithData({
  workflow,
  runs,
  onTrigger,
  index,
}: {
  workflow: Workflow;
  runs: WorkflowRun[];
  onTrigger: (id: string) => void;
  index: number;
}) {
  return (
    <WorkflowCard
      workflow={workflow}
      latestRun={runs[0]}
      runCount={runs.length}
      onTrigger={onTrigger}
      index={index}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader — shimmer cards
// ---------------------------------------------------------------------------

function WorkflowsSkeleton() {
  return (
    <View className="px-5 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200, delay: i * 60 }}
        >
          <SkeletonCard />
        </MotiView>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WorkflowsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useList<Workflow>('workflows');

  const workflows = data?.data ?? [];

  const workflowIds = workflows.map((w) => w.id);
  const { data: runsByWorkflow } = useWorkflowRunsBatched(workflowIds);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTrigger = useCallback(async (id: string) => {
    try {
      await api.post(`/api/workflows/${id}/trigger`);
      haptics.success();
      refetch();
    } catch (e: unknown) {
      haptics.error();
      const msg = e instanceof Error ? e.message : 'Trigger failed';
      Alert.alert('Error', msg);
    }
  }, [refetch]);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Workflows" subtitle="Automated pipeline configurations" />

      {isLoading ? (
        <WorkflowsSkeleton />
      ) : isError ? (
        <ErrorState
          title="Failed to load workflows"
          description={error?.message ?? 'An unexpected error occurred.'}
          onRetry={handleRetry}
        />
      ) : (
        <FlatList
          data={workflows}
          renderItem={({ item, index }) => (
            <WorkflowCardWithData
              workflow={item}
              runs={runsByWorkflow?.[item.id] ?? []}
              onTrigger={handleTrigger}
              index={index}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No workflows yet"
              description="Create your first automation workflow in the web dashboard."
              icon={WorkflowIcon}
            />
          }
        />
      )}
    </View>
  );
}
