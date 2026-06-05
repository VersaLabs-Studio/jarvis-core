"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@jarvis/shared";

export interface AnalyticsSummary {
  eventsToday: number;
  topEventTypes: Array<{ event_type: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  eventDistribution: Array<{ event_type: string; count: number }>;
}

export function useAnalytics() {
  return useQuery({
    queryKey: keys.analyticsEvent.list(),
    queryFn: () => api.getRaw<{ data: AnalyticsSummary }>("/api/analytics"),
  });
}
