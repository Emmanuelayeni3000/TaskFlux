"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";
import { normalizeWorkspace, useWorkspaceStore, type WorkspaceResponse } from "@/store/workspaceStore";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { workspaceFetch } from "@/lib/workspace-request";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const bootstrapAttemptedRef = useRef(false);
  
  // One-time workspace bootstrap using direct store access rather than hooks
  // to avoid the update-during-render problem
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      console.warn("[DashboardLayout] User not authenticated. Redirecting to /login");
      return;
    }

    if (!token || bootstrapAttemptedRef.current) {
      console.info("[DashboardLayout] Skipping bootstrap", {
        hasToken: Boolean(token),
        bootstrapAttempted: bootstrapAttemptedRef.current,
      });
      return;
    }
    
    // Prevent multiple attempts
    bootstrapAttemptedRef.current = true;
    console.info("[DashboardLayout] Bootstrapping workspaces", {
      tokenPresent: Boolean(token),
    });
    
    const abortController = new AbortController();

    const loadWorkspaces = async () => {
      const {
        setWorkspaces,
        setError,
        setLoading,
        setHasInitialized,
        hasInitialized,
        isLoading,
        error,
        workspaces,
        lastFetchedAt,
        markFetched,
      } = useWorkspaceStore.getState();

      if (isLoading) {
        const lastFetch = lastFetchedAt ? new Date(lastFetchedAt).getTime() : 0;
        const ageMs = Date.now() - lastFetch;
        const isStale = ageMs > 5_000;

        console.info("[DashboardLayout] Workspace fetch already in progress", {
          lastFetchedAt,
          ageMs,
          isStale,
        });

        if (!isStale) {
          return;
        }

        console.warn("[DashboardLayout] Previous fetch appears stalled; resetting state");
        setLoading(false);
      }

      const hasWorkspaces = workspaces.length > 0;

      if (hasInitialized && hasWorkspaces) {
        console.info("[DashboardLayout] Workspace store already initialised", {
          hasInitialized,
          workspaceCount: workspaces.length,
        });
        return;
      }

      if (error) {
        console.info("[DashboardLayout] Clearing stale workspace error", { error });
        setError(null);
      }

      setLoading(true);
      console.info("[DashboardLayout] Fetching /workspaces", {
        endpoint: "/workspaces",
      });

      try {
        const response = await workspaceFetch("/workspaces", undefined, {
          workspaceId: null,
          includeQueryParam: false,
          signal: abortController.signal,
        });

        console.info("[DashboardLayout] Received /workspaces response", {
          status: response.status,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = typeof payload?.message === "string" ? payload.message : "Failed to load workspaces";
          console.error("[DashboardLayout] Workspace load failed", {
            status: response.status,
            message,
          });
          setError(message);
          setHasInitialized(true);
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as { workspaces?: WorkspaceResponse[] };
        const normalized = Array.isArray(payload.workspaces)
          ? payload.workspaces.map((workspace) => normalizeWorkspace(workspace))
          : [];

        console.info("[DashboardLayout] Workspaces loaded", {
          workspaceCount: normalized.length,
        });

        setWorkspaces(normalized);
        markFetched();
        setHasInitialized(true);
        setLoading(false);
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          console.info("[DashboardLayout] Workspace fetch aborted");
          setLoading(false);
          return;
        }

        const message = err instanceof Error ? err.message : "Failed to load workspaces";
        console.error("[DashboardLayout] Workspace load threw", { message, error: err });
        setError(message);
        setHasInitialized(true);
        setLoading(false);
      }
    };

    const fetchPromise = loadWorkspaces();

    return () => {
      bootstrapAttemptedRef.current = false;
      abortController.abort();
      console.info("[DashboardLayout] Cleanup triggered, aborting workspace fetch");
      void fetchPromise;
    };
  }, [isAuthenticated, token, router]);

  return (
    <>
      <NotificationProvider />
      {children}
    </>
  );
}