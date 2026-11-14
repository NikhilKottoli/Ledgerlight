"use client";

import useSWR from "swr";
import type { MetricArtifact } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export function useMetric(metricId: string) {
  const { data, error, isLoading, mutate } = useSWR<MetricArtifact>(
    `/api/data/${metricId}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    artifact: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useMetrics(metricIds: string[]) {
  const results = metricIds.map((id) => useMetric(id));
  return {
    artifacts: results.map((r) => r.artifact),
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    mutateAll: () => results.forEach((r) => r.mutate()),
  };
}