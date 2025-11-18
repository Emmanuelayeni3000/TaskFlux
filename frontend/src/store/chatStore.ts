import { create } from "zustand";

export type ChatConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface ChatAuthor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

export type ChatMessageType = "TEXT" | "IMAGE" | "AUDIO";

export interface ChatMessage {
  id: string;
  workspaceId: string;
  type: ChatMessageType;
  content: string | null;
  attachmentUrl: string | null;
  attachmentMimeType: string | null;
  attachmentDurationMs: number | null;
  mentions: unknown;
  createdAt: string;
  author: ChatAuthor;
}

type MessageMergeMode = "append" | "prepend" | "replace";

type MessageIndex = Record<string, true>;

type MessageIndexMap = Record<string, MessageIndex>;

type BooleanMap = Record<string, boolean>;

type NullableStringMap = Record<string, string | null>;

type NumberMap = Record<string, number>;

type HistoryFetchMode = "initial" | "older" | null;

type HistoryModeMap = Record<string, HistoryFetchMode>;

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  messageIndex: MessageIndexMap;
  nextCursor: NullableStringMap;
  historyLoading: BooleanMap;
  historyComplete: BooleanMap;
  historyMode: HistoryModeMap;
  connectionStatus: ChatConnectionStatus;
  unreadCounts: NumberMap;
  activeWorkspaceId: string | null;
  joinedWorkspaces: BooleanMap;
  error: string | null;
  setConnectionStatus: (status: ChatConnectionStatus) => void;
  setError: (error: string | null) => void;
  setHistoryLoading: (workspaceId: string, loading: boolean, mode: HistoryFetchMode) => void;
  setHistoryCursor: (workspaceId: string, cursor: string | null) => void;
  markHistoryComplete: (workspaceId: string) => void;
  mergeMessages: (workspaceId: string, messages: ChatMessage[], mode?: MessageMergeMode) => void;
  receiveMessage: (message: ChatMessage, origin?: "incoming" | "outgoing") => void;
  markWorkspaceActive: (workspaceId: string | null) => void;
  setWorkspaceJoined: (workspaceId: string, joined: boolean) => void;
  resetWorkspace: (workspaceId: string) => void;
  clearAll: () => void;
}

const sortByCreatedAt = (a: ChatMessage, b: ChatMessage) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  messageIndex: {},
  nextCursor: {},
  historyLoading: {},
  historyComplete: {},
  historyMode: {},
  connectionStatus: "idle",
  unreadCounts: {},
  activeWorkspaceId: null,
  joinedWorkspaces: {},
  error: null,
  setConnectionStatus: (status) =>
    set((state) => {
      if (state.connectionStatus === status) {
        return state;
      }
      return { connectionStatus: status };
    }),
  setError: (error) =>
    set((state) => {
      if (state.error === error) {
        return state;
      }
      return { error };
    }),
  setHistoryLoading: (workspaceId, loading, mode) =>
    set((state) => ({
      historyLoading: { ...state.historyLoading, [workspaceId]: loading },
      historyMode: { ...state.historyMode, [workspaceId]: mode },
    })),
  setHistoryCursor: (workspaceId, cursor) =>
    set((state) => ({
      nextCursor: { ...state.nextCursor, [workspaceId]: cursor ?? null },
      historyComplete:
        cursor === null
          ? state.historyComplete
          : { ...state.historyComplete, [workspaceId]: false },
    })),
  markHistoryComplete: (workspaceId) =>
    set((state) => ({
      historyComplete: { ...state.historyComplete, [workspaceId]: true },
    })),
  mergeMessages: (workspaceId, messages, mode = "append") =>
    set((state) => {
      if (messages.length === 0) {
        return state;
      }

      const currentMessages = mode === "replace" ? [] : [...(state.messages[workspaceId] ?? [])];
      const currentIndex: MessageIndex = mode === "replace"
        ? {}
        : { ...(state.messageIndex[workspaceId] ?? {}) };

      let nextMessages = currentMessages;
      let nextIndex = currentIndex;

      if (mode === "replace") {
        nextMessages = [];
        nextIndex = {};
      }

      for (const message of messages) {
        if (nextIndex[message.id]) {
          nextMessages = nextMessages.map((item) => (item.id === message.id ? message : item));
          continue;
        }

        nextIndex[message.id] = true;
        if (mode === "prepend") {
          nextMessages = [message, ...nextMessages];
        } else {
          nextMessages = [...nextMessages, message];
        }
      }

      nextMessages.sort(sortByCreatedAt);

      return {
        messages: { ...state.messages, [workspaceId]: nextMessages },
        messageIndex: { ...state.messageIndex, [workspaceId]: nextIndex },
      };
    }),
  receiveMessage: (message, origin = "incoming") =>
    set((state) => {
      const workspaceId = message.workspaceId;
      const existingMessages = state.messages[workspaceId] ?? [];
      const existingIndex = { ...(state.messageIndex[workspaceId] ?? {}) };

      if (existingIndex[message.id]) {
        const updatedMessages = existingMessages.map((item) =>
          item.id === message.id ? message : item
        );

        return {
          messages: { ...state.messages, [workspaceId]: updatedMessages.sort(sortByCreatedAt) },
          messageIndex: { ...state.messageIndex, [workspaceId]: existingIndex },
        };
      }

      const nextMessages = [...existingMessages, message].sort(sortByCreatedAt);
      existingIndex[message.id] = true;

      let unreadCounts = state.unreadCounts;
      if (origin === "incoming" && state.activeWorkspaceId !== workspaceId) {
        unreadCounts = {
          ...state.unreadCounts,
          [workspaceId]: (state.unreadCounts[workspaceId] ?? 0) + 1,
        };
      }

      return {
        messages: { ...state.messages, [workspaceId]: nextMessages },
        messageIndex: { ...state.messageIndex, [workspaceId]: existingIndex },
        unreadCounts,
      };
    }),
  markWorkspaceActive: (workspaceId) =>
    set((state) => {
      if (!workspaceId) {
        return { activeWorkspaceId: null };
      }

      const unread = state.unreadCounts[workspaceId];
      const nextUnread = unread ? { ...state.unreadCounts, [workspaceId]: 0 } : state.unreadCounts;

      return {
        activeWorkspaceId: workspaceId,
        unreadCounts: nextUnread,
      };
    }),
  setWorkspaceJoined: (workspaceId, joined) =>
    set((state) => ({
      joinedWorkspaces: { ...state.joinedWorkspaces, [workspaceId]: joined },
    })),
  resetWorkspace: (workspaceId) =>
    set((state) => {
      const restMessages = { ...state.messages };
      const restIndex = { ...state.messageIndex };
      const restCursor = { ...state.nextCursor };
      const restLoading = { ...state.historyLoading };
      const restComplete = { ...state.historyComplete };
      const restMode = { ...state.historyMode };
      const restUnread = { ...state.unreadCounts };
      const restJoined = { ...state.joinedWorkspaces };

      delete restMessages[workspaceId];
      delete restIndex[workspaceId];
      delete restCursor[workspaceId];
      delete restLoading[workspaceId];
      delete restComplete[workspaceId];
      delete restMode[workspaceId];
      delete restUnread[workspaceId];
      delete restJoined[workspaceId];

      return {
        messages: restMessages,
        messageIndex: restIndex,
        nextCursor: restCursor,
        historyLoading: restLoading,
        historyComplete: restComplete,
        historyMode: restMode,
        unreadCounts: restUnread,
        joinedWorkspaces: restJoined,
        activeWorkspaceId: state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
      };
    }),
  clearAll: () =>
    set({
      messages: {},
      messageIndex: {},
      nextCursor: {},
      historyLoading: {},
      historyComplete: {},
      historyMode: {},
      unreadCounts: {},
      joinedWorkspaces: {},
      activeWorkspaceId: null,
      connectionStatus: "idle",
      error: null,
    }),
}));
