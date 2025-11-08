import { create } from "zustand";

import { useWorkspaceStore } from "./workspaceStore";
import { useChatStore } from "./chatStore";

interface User {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: (token, user) => {
    useWorkspaceStore.getState().reset();
    useChatStore.getState().clearAll();
    set({ token, user, isAuthenticated: true, error: null });
  },
  logout: () => {
    useWorkspaceStore.getState().reset();
    useChatStore.getState().clearAll();
    set({ token: null, user: null, isAuthenticated: false });
  },
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
