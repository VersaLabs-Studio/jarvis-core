"use client";

import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  SkeletonCard,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminOverview } from "./_hooks/use-admin";
import { SystemInfoCard } from "./_components/system-info";
import { SecuritySettingsCard } from "./_components/security-settings";
import { BackupControls } from "./_components/backup-controls";
import { SystemActions } from "./_components/system-actions";
import { useAuth } from "@/hooks/use-auth";

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const admin = useAdminOverview();

  if (authLoading) {
    return <AdminSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="rounded-full bg-error/10 p-4 mx-auto mb-4 w-fit">
            <svg className="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (admin.isLoading) {
    return <AdminSkeleton />;
  }

  if (admin.isError) {
    return (
      <ErrorState
        title="Failed to load admin data"
        description={admin.error?.message ?? "Could not load admin overview."}
        onRetry={() => admin.refetch()}
      />
    );
  }

  const data = admin.data?.data;

  return (
    <DataView className="space-y-6">
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <Badge variant="warning">Admin Only</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          System administration and monitoring
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Users"
          value={data?.stats.totalUsers ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Users"
          value={data?.stats.activeUsers ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Workflows"
          value={data?.stats.totalWorkflows ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          }
        />
        <StatCard
          label="Integrations"
          value={data?.stats.totalIntegrations ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          }
        />
      </motion.div>

      {data?.system && (
        <motion.div variants={itemVariants}>
          <SystemInfoCard system={data.system} />
        </motion.div>
      )}

      {data?.security && (
        <motion.div variants={itemVariants}>
          <SecuritySettingsCard security={data.security} />
        </motion.div>
      )}

      {data?.backup && (
        <motion.div variants={itemVariants}>
          <BackupControls backup={data.backup} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <SystemActions />
      </motion.div>

      {data?.users && data.users.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.role} &middot; Joined{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        user.status === "active" ? "success" :
                        user.status === "suspended" ? "error" :
                        "secondary"
                      }
                    >
                      {user.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </DataView>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
