import { create } from "zustand";

interface TaskRefreshStore {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const useTaskRefreshStore = create<TaskRefreshStore>((set) => ({
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));