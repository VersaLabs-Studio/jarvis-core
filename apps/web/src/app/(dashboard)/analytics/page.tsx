"use client";

import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  SkeletonCard,
  EmptyState,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "./_hooks/use-analytics";

export default function AnalyticsPage() {
  const analytics = useAnalytics();

  if (analytics.isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (analytics.isError) {
    return (
      <ErrorState
        title="Failed to load analytics"
        description={analytics.error?.message ?? "Could not load analytics data."}
        onRetry={() => analytics.refetch()}
      />
    );
  }

  const data = analytics.data?.data;
  const maxDistribution = Math.max(...(data?.eventDistribution?.map((d) => d.count) ?? [1]));

  return (
    <DataView className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Event tracking and system activity
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Events Today"
          value={data?.eventsToday ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Top Event"
          value={data?.topEventTypes?.[0]?.event_type ?? "N/A"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
        <StatCard
          label="Event Types"
          value={data?.eventDistribution?.length ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
        />
        <StatCard
          label="Active Days"
          value={data?.dailyActivity?.length ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Event Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.eventDistribution || data.eventDistribution.length === 0 ? (
                <EmptyState
                  title="No events"
                  description="Event distribution will appear here once events are recorded."
                />
              ) : (
                <div className="space-y-3">
                  {data.eventDistribution.map((item) => (
                    <div key={item.event_type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate mr-4">{item.event_type}</span>
                        <span className="text-muted-foreground tabular-nums">{item.count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxDistribution) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.dailyActivity || data.dailyActivity.length === 0 ? (
                <EmptyState
                  title="No activity"
                  description="Daily activity timeline will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {data.dailyActivity.map((day) => {
                    const maxDaily = Math.max(...data.dailyActivity.map((d) => d.count), 1);
                    const pct = (day.count / maxDaily) * 100;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 tabular-nums">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                            className="h-full rounded bg-info/60 flex items-center justify-end pr-2"
                          >
                            {day.count > 0 && (
                              <span className="text-[10px] font-medium text-info-foreground tabular-nums">
                                {day.count}
                              </span>
                            )}
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Top Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topEventTypes || data.topEventTypes.length === 0 ? (
              <EmptyState
                title="No event types"
                description="Top event types will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.topEventTypes.map((item, i) => (
                  <div
                    key={item.event_type}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.event_type}</p>
                      <p className="text-xs text-muted-foreground">{item.count} events</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DataView>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  );
}
