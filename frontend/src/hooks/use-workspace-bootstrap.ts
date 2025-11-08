import { useEffect } from "react";

import { workspaceFetch } from "@/lib/workspace-request";
import { useAuthStore } from "@/store/authStore";
import {
  normalizeWorkspace,
  type WorkspaceResponse,
  useWorkspaceStore,
} from "@/store/workspaceStore";

const FALLBACK_ERROR = "Unable to load workspaces. Please try again.";

const parseWorkspaceError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // ignore JSON parse failures and fall through to status text fallback
  }

  return response.statusText || FALLBACK_ERROR;
};

export function useWorkspaceBootstrap() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const setError = useWorkspaceStore((state) => state.setError);
  const setLoading = useWorkspaceStore((state) => state.setLoading);
  const setHasInitialized = useWorkspaceStore((state) => state.setHasInitialized);
  const hasInitialized = useWorkspaceStore((state) => state.hasInitialized);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const currentError = useWorkspaceStore((state) => state.error);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    if (hasInitialized || isLoading) {
      return;
    }

    let cancelled = false;

    const loadWorkspaces = async () => {
      if (currentError !== null) {
        setError(null);
      }
      setLoading(true);

      try {
        const response = await workspaceFetch("/workspaces", undefined, {
          workspaceId: null,
          includeQueryParam: false,
        });

        if (!response.ok) {
          const message = await parseWorkspaceError(response);
          if (!cancelled) {
            setError(message || FALLBACK_ERROR);
          }
          return;
        }

        const payload = (await response.json()) as { workspaces?: WorkspaceResponse[] };
        if (cancelled) {
          return;
        }

        const normalized = Array.isArray(payload.workspaces)
          ? payload.workspaces.map((workspace) => normalizeWorkspace(workspace))
          : [];

        setWorkspaces(normalized);
      } catch (error: unknown) {
        if (!cancelled) {
          const fallback = error instanceof Error ? error.message : FALLBACK_ERROR;
          setError(fallback);
        }
      } finally {
        if (!cancelled) {
          setHasInitialized(true);
          setLoading(false);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [currentError, hasInitialized, isLoading, isAuthenticated, setError, setHasInitialized, setLoading, setWorkspaces, token]);
}
