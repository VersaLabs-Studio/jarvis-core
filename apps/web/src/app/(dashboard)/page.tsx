"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Service } from "@jarvis/shared";
import { keys } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useList } from "@/hooks/use-entity";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Skeleton,
  SkeletonCard,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardSummary {
  totalServices: number;
  runningServices: number;
  totalWorkflows: number;
  activeWorkflows: number;
  recentEvents: number;
  systemHealth: "healthy" | "degraded" | "down";
}

function useDashboardData() {
  return useQuery({
    queryKey: keys.service.list(),
    queryFn: () => api.list<Service>("services"),
  });
}

export default function DashboardPage() {
  const services = useDashboardData();

  if (services.isLoading) {
    return <DashboardSkeleton />;
  }

  if (services.isError) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        description={services.error?.message ?? "Could not load dashboard data."}
        onRetry={() => services.refetch()}
      />
    );
  }

  const serviceList = services.data?.data ?? [];
  const runningCount = serviceList.filter((s) => s.status === "running").length;
  const stoppedCount = serviceList.filter((s) => s.status === "stopped").length;
  const errorCount = serviceList.filter((s) => s.status === "error").length;

  return (
    <DataView className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System overview and quick actions
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Services"
          value={serviceList.length}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
            </svg>
          }
        />
        <StatCard
          label="Running"
          value={runningCount}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Stopped"
          value={stoppedCount}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
            </svg>
          }
        />
        <StatCard
          label="Errors"
          value={errorCount}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Services</CardTitle>
                <Link href="/services">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {serviceList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No services configured yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {serviceList.slice(0, 5).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-2 w-2 rounded-full ${
                          service.status === "running"
                            ? "bg-success"
                            : service.status === "error"
                              ? "bg-error"
                              : service.status === "provisioning"
                                ? "bg-warning animate-pulse"
                                : "bg-muted-foreground"
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.type}</p>
                        </div>
                      </div>
                      <Badge variant={
                        service.status === "running" ? "success" :
                        service.status === "error" ? "error" :
                        service.status === "provisioning" ? "warning" :
                        "secondary"
                      }>
                        {service.status}
                      </Badge>
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
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/services" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Add a service</p>
                    <p className="text-xs text-muted-foreground">Deploy a new service to your infrastructure</p>
                  </div>
                </div>
              </Link>
              <Link href="/logs" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="rounded-lg bg-info/10 p-2 text-info">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">View logs</p>
                    <p className="text-xs text-muted-foreground">Check system logs and debug issues</p>
                  </div>
                </div>
              </Link>
              <Link href="/analytics" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="rounded-lg bg-warning/10 p-2 text-warning">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">View analytics</p>
                    <p className="text-xs text-muted-foreground">Monitor events and system activity</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DataView>
  );
}

function DashboardSkeleton() {
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
    </div>
  );
}
