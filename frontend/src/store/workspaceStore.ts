import { useMemo } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WorkspaceType = "personal" | "team";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceInviter {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  role: WorkspaceRole;
  membershipId: string;
  membershipCreatedAt: string;
  createdAt: string;
  updatedAt?: string;
  invitedBy: WorkspaceInviter | null;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  isSwitching: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  switchWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (workspaceId: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHasInitialized: (initialized: boolean) => void;
  markFetched: () => void;
  reset: () => void;
}

const initialState: Pick<WorkspaceState, "workspaces" | "currentWorkspaceId" | "isSwitching" | "isLoading" | "hasInitialized" | "error" | "lastFetchedAt"> = {
  workspaces: [],
  currentWorkspaceId: "",
  isSwitching: false,
  isLoading: false,
  hasInitialized: false,
  error: null,
  lastFetchedAt: null,
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setWorkspaces: (workspaces) => {
        const existingId = get().currentWorkspaceId;
        const nextWorkspaceId = workspaces.some((workspace) => workspace.id === existingId)
          ? existingId
          : workspaces[0]?.id ?? "";

        set({
          workspaces,
          currentWorkspaceId: nextWorkspaceId,
          isSwitching: false,
          error: null,
        });
      },
      switchWorkspace: (workspaceId) => {
        if (workspaceId === get().currentWorkspaceId) {
          return;
        }

        const exists = get().workspaces.some((workspace) => workspace.id === workspaceId);
        if (!exists) {
          set({ error: "Selected workspace is not available." });
          return;
        }

        set({ currentWorkspaceId: workspaceId, isSwitching: true, error: null });
        setTimeout(() => {
          set({ isSwitching: false });
        }, 160);
      },
      addWorkspace: (workspace) => {
        set((state) => {
          const existingIndex = state.workspaces.findIndex((item) => item.id === workspace.id);
          const nextWorkspaces = existingIndex >= 0
            ? state.workspaces.map((item, index) => (index === existingIndex ? workspace : item))
            : [...state.workspaces, workspace];

          return {
            workspaces: nextWorkspaces,
            currentWorkspaceId: workspace.id,
            isSwitching: false,
            isLoading: false,
            hasInitialized: true,
            error: null,
            lastFetchedAt: new Date().toISOString(),
          };
        });
      },
      removeWorkspace: (workspaceId) => {
        const { workspaces, currentWorkspaceId } = get();
        const filtered = workspaces.filter((workspace) => workspace.id !== workspaceId);
        set({
          workspaces: filtered,
          currentWorkspaceId:
            currentWorkspaceId === workspaceId ? filtered[0]?.id ?? "" : currentWorkspaceId,
          hasInitialized: true,
          error: null,
          lastFetchedAt: new Date().toISOString(),
        });
      },
      setError: (error) => {
        set({ error });
      },
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      setHasInitialized: (initialized) => {
        set({ hasInitialized: initialized });
      },
      markFetched: () => {
        set({ lastFetchedAt: new Date().toISOString(), isLoading: false, hasInitialized: true });
      },
      reset: () => {
        set({ ...initialState });
      },
    }),
    {
      name: "taskflux-workspace-store",
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return { ...initialState };
        }

        if (version < 2) {
          return { ...initialState };
        }

        const state = persistedState as Partial<WorkspaceState>;
        return {
          ...initialState,
          ...state,
          workspaces: Array.isArray(state.workspaces) ? state.workspaces : [],
          currentWorkspaceId: state.currentWorkspaceId ?? "",
          isSwitching: false,
          isLoading: false,
          hasInitialized: state.hasInitialized ?? false,
          error: state.error ?? null,
          lastFetchedAt: state.lastFetchedAt ?? null,
        } satisfies Partial<WorkspaceState>;
      },
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
    }
  )
);

export const useCurrentWorkspace = () => {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );
};

export const usePersonalWorkspace = () => {
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  return useMemo(
    () => workspaces.find((workspace) => workspace.type === "personal"),
    [workspaces]
  );
};

export const useTeamWorkspaces = () => {
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  return useMemo(
    () => workspaces.filter((workspace) => workspace.type === "team"),
    [workspaces]
  );
};

export interface WorkspaceResponse {
  id: string;
  name: string;
  type: WorkspaceType;
  role: WorkspaceRole;
  membershipId?: string; // Changed to optional
  membershipCreatedAt?: string; // Changed to optional
  createdAt: string;
  updatedAt?: string;
  invitedBy?: WorkspaceInviter | null; // Changed to use WorkspaceInviter
}

export const normalizeWorkspace = (workspace: WorkspaceResponse): Workspace => ({
  id: workspace.id,
  name: workspace.name,
  type: workspace.type,
  role: workspace.role,
  membershipId: workspace.membershipId ?? "", // Default to empty string if undefined
  membershipCreatedAt: workspace.membershipCreatedAt ?? "", // Default to empty string if undefined
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
  invitedBy: workspace.invitedBy ?? null, // Simplified to use optional chaining
});
