"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Service, ServiceStatus } from "@jarvis/shared";
import { containerVariants, itemVariants } from "@/lib/motion";
import {
  Skeleton,
  SkeletonCard,
  EmptyState,
  ErrorState,
  DataView,
} from "@/components/ui/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "./_hooks/use-services";
import { ServiceForm } from "./_components/service-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusVariant: Record<ServiceStatus, "success" | "warning" | "error" | "secondary"> = {
  running: "success",
  provisioning: "warning",
  stopped: "secondary",
  error: "error",
  terminated: "secondary",
};

export default function ServicesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const services = useServices();
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditing(service);
    setFormOpen(true);
  };

  const handleSubmit = (data: { name: string; type: string; config?: Record<string, unknown> }) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: data },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this service?")) {
      deleteMutation.mutate(id);
    }
  };

  if (services.isLoading) {
    return <ServicesSkeleton />;
  }

  if (services.isError) {
    return (
      <ErrorState
        title="Failed to load services"
        description={services.error?.message ?? "Could not load services."}
        onRetry={() => services.refetch()}
      />
    );
  }

  const serviceList = services.data?.data ?? [];

  return (
    <DataView className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployed services
          </p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Service
        </Button>
      </motion.div>

      {serviceList.length === 0 ? (
        <EmptyState
          title="No services"
          description="Deploy your first service to get started."
          action={
            <Button onClick={handleCreate}>Add Service</Button>
          }
        />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {serviceList.map((service) => (
            <motion.div key={service.id} variants={itemVariants}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <Badge variant={statusVariant[service.status] ?? "secondary"}>
                      {service.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{service.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(service.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(service)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-error hover:text-error"
                      onClick={() => handleDelete(service.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            defaultValues={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DataView>
  );
}

function ServicesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
