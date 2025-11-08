import { useCallback, useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { workspaceFetch } from "@/lib/workspace-request";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  type: "TASK" | "PROJECT" | "MEETING" | "REMINDER" | "OTHER";
  workspaceId: string;
  taskId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useWorkspaceEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentWorkspace = useCurrentWorkspace();

  const fetchEvents = useCallback(async (signal?: AbortSignal) => {
    if (!currentWorkspace?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await workspaceFetch("/events", undefined, {
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || "Failed to fetch events";
        throw new Error(message);
      }

      const data = await response.json();
      const eventList = Array.isArray(data.events) ? data.events : [];
      setEvents(eventList);
    } catch (err: unknown) {
      if (signal?.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to fetch events";
      setError(message);
      console.error("[useWorkspaceEvents] Error:", err);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentWorkspace?.id]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    void fetchEvents(controller.signal);
    return () => controller.abort();
  }, [fetchEvents]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchEvents(controller.signal);
    return () => controller.abort();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refetch,
  };
}