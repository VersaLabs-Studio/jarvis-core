"use client";

import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  SkeletonCard,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfig, useUpdateEnvVar } from "./_hooks/use-config";
import { EnvVarDisplay } from "./_components/env-var-display";
import { FileExplorer } from "./_components/file-explorer";

export default function ConfigPage() {
  const config = useConfig();
  const updateEnv = useUpdateEnvVar();

  if (config.isLoading) {
    return <ConfigSkeleton />;
  }

  if (config.isError) {
    return (
      <ErrorState
        title="Failed to load config"
        description={config.error?.message ?? "Could not load configuration."}
        onRetry={() => config.refetch()}
      />
    );
  }

  const data = config.data?.data;

  return (
    <DataView className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Environment variables and file system
          </p>
        </div>
        <Button variant="outline" onClick={() => config.refetch()}>
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.envVars || data.envVars.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No environment variables configured.
                </p>
              ) : (
                <EnvVarDisplay
                  envVars={data.envVars}
                  onUpdate={(key, value) => updateEnv.mutate({ key, value })}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>File System</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.files || data.files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No files found.
                </p>
              ) : (
                <FileExplorer files={data.files} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {data?.rawConfig && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Raw Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                {data.rawConfig}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </DataView>
  );
}

function ConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
