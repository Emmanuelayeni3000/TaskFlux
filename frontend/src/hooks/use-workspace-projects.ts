import { useCallback, useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { workspaceFetch } from "@/lib/workspace-request";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export function useWorkspaceProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentWorkspace = useCurrentWorkspace();

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    if (!currentWorkspace?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await workspaceFetch("/projects", undefined, {
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || "Failed to fetch projects";
        throw new Error(message);
      }

      const data = await response.json();
      const projectList = Array.isArray(data.projects) ? data.projects : [];
      setProjects(projectList);
    } catch (err: unknown) {
      if (signal?.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to fetch projects";
      setError(message);
      console.error("[useWorkspaceProjects] Error:", err);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentWorkspace?.id]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refetch,
  };
}