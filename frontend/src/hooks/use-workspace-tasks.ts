import { useCallback, useEffect, useRef, useState } from "react";

import { workspaceFetch } from "@/lib/workspace-request";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { useTaskRefreshStore } from "@/store/taskRefreshStore";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface WorkspaceTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseWorkspaceTasksState {
  tasks: WorkspaceTask[];
  isLoading: boolean;
  error: string | null;
}

export function useWorkspaceTasks() {
  const workspace = useCurrentWorkspace();
  const refreshTrigger = useTaskRefreshStore((state) => state.refreshTrigger);
  const [state, setState] = useState<UseWorkspaceTasksState>({
    tasks: [],
    isLoading: false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(
    async (options?: { skipLoadingState?: boolean }) => {
      if (!workspace?.id) {
        setState((prev) => ({ ...prev, tasks: [], error: null, isLoading: false }));
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!options?.skipLoadingState) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const response = await workspaceFetch("/tasks", undefined, {
          workspaceId: workspace.id,
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = typeof payload?.message === "string" ? payload.message : "Unable to load tasks";
          setState({ tasks: [], isLoading: false, error: message });
          return;
        }

        const payload = await response.json();
        const tasks: WorkspaceTask[] = Array.isArray(payload?.tasks) ? payload.tasks : [];
        setState({ tasks, isLoading: false, error: null });
      } catch (error: unknown) {
        if ((error instanceof Error && error.name === "AbortError") || controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load tasks";
        setState({ tasks: [], isLoading: false, error: message });
      }
    },
    [workspace?.id]
  );

  useEffect(() => {
    void fetchTasks();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchTasks]);

  // Refetch when refresh is triggered globally
  useEffect(() => {
    if (refreshTrigger > 0) {
      void fetchTasks({ skipLoadingState: true });
    }
  }, [refreshTrigger, fetchTasks]);

  return {
    ...state,
    refetch: fetchTasks,
    workspaceId: workspace?.id ?? null,
  };
}
