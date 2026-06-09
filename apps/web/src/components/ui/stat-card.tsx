"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/lib/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/data-states";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              {trend && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-success" : "text-error",
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </p>
              )}
            </div>
            <div className="rounded-lg bg-muted p-3 text-muted-foreground">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  );
}
