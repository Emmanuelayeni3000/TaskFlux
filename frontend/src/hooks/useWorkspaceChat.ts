import { useCallback, useEffect, useMemo } from "react";
import { io, type Socket } from "socket.io-client";

import { workspaceFetch } from "@/lib/workspace-request";
import { useAuthStore } from "@/store/authStore";
import { useChatStore, type ChatMessage } from "@/store/chatStore";
import { useTeamWorkspaces, useWorkspaceStore } from "@/store/workspaceStore";

let socketInstance: Socket | null = null;
let listenersAttached = false;

const SOCKET_ERROR_GENERIC = "Unable to connect to team chat";
const HISTORY_ERROR_GENERIC = "Unable to load chat history";
const MESSAGE_ERROR_GENERIC = "Unable to send message";

const resolveSocketUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) {
    return configured;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiBase) {
    return undefined;
  }

  try {
    const url = new URL(apiBase);
    // Remove any trailing path (e.g. /api) so we connect to the origin host.
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (error) {
    console.warn("[Chat] Invalid NEXT_PUBLIC_API_URL", { apiBase, error });
    return apiBase;
  }
};

const attachSocketListeners = () => {
  if (!socketInstance || listenersAttached) {
    return;
  }

  listenersAttached = true;

  socketInstance.on("connect", () => {
    useChatStore.getState().setConnectionStatus("connected");
    useChatStore.getState().setError(null);
  });

  socketInstance.on("disconnect", () => {
    useChatStore.getState().setConnectionStatus("disconnected");
  });

  socketInstance.io.on("reconnect_attempt", () => {
    useChatStore.getState().setConnectionStatus("connecting");
  });

  socketInstance.on("connect_error", (error) => {
    console.error("[Chat] Socket connection error", error);
    useChatStore.getState().setConnectionStatus("error");
    useChatStore.getState().setError(error?.message ?? SOCKET_ERROR_GENERIC);
  });

  socketInstance.on("chat:message", (payload: ChatMessage) => {
    if (!payload?.workspaceId) {
      return;
    }

    useChatStore.getState().receiveMessage({
      ...payload,
      createdAt: payload.createdAt,
      workspaceId: payload.workspaceId,
    }, "incoming");
  });
};

const ensureSocket = (token: string) => {
  const url = resolveSocketUrl();
  if (!url) {
    useChatStore.getState().setConnectionStatus("error");
    useChatStore.getState().setError("Socket URL not configured");
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(url, {
      transports: ["websocket"],
      autoConnect: false,
      withCredentials: true,
    });
  }

  socketInstance.auth = { token };

  if (!socketInstance.connected) {
    useChatStore.getState().setConnectionStatus("connecting");
    socketInstance.connect();
  }

  attachSocketListeners();
  return socketInstance;
};

const joinWorkspaceRoom = (workspaceId: string, socket: Socket) => {
  const store = useChatStore.getState();
  if (store.joinedWorkspaces[workspaceId]) {
    return;
  }

  socket.emit("chat:join", { workspaceId }, (response: unknown) => {
    const payload = response as { status?: string; message?: string } | undefined;

    if (payload?.status === "ok") {
      useChatStore.getState().setWorkspaceJoined(workspaceId, true);
      return;
    }

    const message = (payload && typeof payload.message === "string")
      ? payload.message
      : "Unable to join chat room";
    useChatStore.getState().setError(message);
  });
};

export function useChatConnection() {
  const token = useAuthStore((state) => state.token);
  const teamWorkspaces = useTeamWorkspaces();

  useEffect(() => {
    if (!token) {
      useChatStore.getState().setConnectionStatus("idle");
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        listenersAttached = false;
      }
      return;
    }

    const socket = ensureSocket(token);
    if (!socket) {
      return;
    }

    for (const workspace of teamWorkspaces) {
      joinWorkspaceRoom(workspace.id, socket);
    }
  }, [teamWorkspaces, token]);
}

export function useWorkspaceChat(options?: {
  workspaceId?: string;
  autoJoin?: boolean;
  autoLoadHistory?: boolean;
  markActive?: boolean;
}) {
  const { autoJoin = true, autoLoadHistory = true, markActive = false } = options ?? {};
  const token = useAuthStore((state) => state.token);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaceId = options?.workspaceId ?? currentWorkspaceId;

  useChatConnection();

  const messages = useChatStore((state) => (workspaceId ? state.messages[workspaceId] ?? [] : []));
  const connectionStatus = useChatStore((state) => state.connectionStatus);
  const isHistoryLoading = useChatStore((state) => (workspaceId ? state.historyLoading[workspaceId] ?? false : false));
  const historyMode = useChatStore((state) => (workspaceId ? state.historyMode[workspaceId] ?? null : null));
  const nextCursor = useChatStore((state) => (workspaceId ? state.nextCursor[workspaceId] ?? null : null));
  const historyComplete = useChatStore((state) => (workspaceId ? state.historyComplete[workspaceId] ?? false : false));
  const unreadCount = useChatStore((state) => (workspaceId ? state.unreadCounts[workspaceId] ?? 0 : 0));
  const isJoined = useChatStore((state) => (workspaceId ? !!state.joinedWorkspaces[workspaceId] : false));
  const chatError = useChatStore((state) => state.error);

  useEffect(() => {
    if (!workspaceId || !token) {
      return;
    }

    const socket = ensureSocket(token);
    if (!socket) {
      return;
    }

    if (autoJoin) {
      joinWorkspaceRoom(workspaceId, socket);
    }

    if (markActive) {
      useChatStore.getState().markWorkspaceActive(workspaceId);
    }

    return () => {
      if (markActive && useChatStore.getState().activeWorkspaceId === workspaceId) {
        useChatStore.getState().markWorkspaceActive(null);
      }
    };
  }, [autoJoin, markActive, token, workspaceId]);

  const loadHistory = useCallback(
    async (mode: "initial" | "older" = "initial") => {
      if (!workspaceId) {
        return false;
      }

      const chatState = useChatStore.getState();
      if (chatState.historyLoading[workspaceId]) {
        return false;
      }

      if (mode === "older" && chatState.historyComplete[workspaceId]) {
        return false;
      }

      const cursor = mode === "older" ? chatState.nextCursor[workspaceId] : undefined;
      if (mode === "older" && !cursor) {
        chatState.markHistoryComplete(workspaceId);
        return false;
      }

      chatState.setHistoryLoading(workspaceId, true, mode);

      try {
        const params = new URLSearchParams();
        if (mode === "older" && cursor) {
          params.set("cursor", cursor);
        }

        const response = await workspaceFetch(
          `/workspaces/${workspaceId}/chat/messages${params.toString() ? `?${params.toString()}` : ""}`,
          undefined,
          {
            workspaceId,
            includeQueryParam: false,
          }
        );

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok || !payload || typeof payload !== "object" || !("messages" in payload)) {
          const message =
            payload && typeof (payload as Record<string, unknown>).message === "string"
              ? String((payload as Record<string, unknown>).message)
              : HISTORY_ERROR_GENERIC;
          useChatStore.getState().setError(message);
          return false;
        }

        const data = payload as { messages: ChatMessage[]; nextCursor: string | null };
        const formatted = Array.isArray(data.messages)
          ? data.messages.map((message) => ({
              ...message,
              workspaceId,
            }))
          : [];

        useChatStore.getState().mergeMessages(
          workspaceId,
          formatted,
          mode === "older" ? "prepend" : "replace"
        );

        useChatStore.getState().setHistoryCursor(workspaceId, data.nextCursor ?? null);
        if (!data.nextCursor) {
          useChatStore.getState().markHistoryComplete(workspaceId);
        }

        return true;
      } catch (error) {
        const fallback = error instanceof Error ? error.message : HISTORY_ERROR_GENERIC;
        useChatStore.getState().setError(fallback);
        return false;
      } finally {
        useChatStore.getState().setHistoryLoading(workspaceId, false, null);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    if (!workspaceId || !autoLoadHistory) {
      return;
    }

    if (messages.length > 0 || isHistoryLoading) {
      return;
    }

    void loadHistory("initial");
  }, [autoLoadHistory, isHistoryLoading, loadHistory, messages.length, workspaceId]);

  const sendMessage = useCallback(
    (content: string, mentions?: Array<{ userId: string; username: string }>) => {
      if (!workspaceId) {
        return Promise.reject(new Error("Workspace context missing"));
      }

      const tokenValue = useAuthStore.getState().token;
      if (!tokenValue) {
        return Promise.reject(new Error("Authentication required"));
      }

      const socket = ensureSocket(tokenValue);
      if (!socket) {
        return Promise.reject(new Error(SOCKET_ERROR_GENERIC));
      }

      if (autoJoin) {
        joinWorkspaceRoom(workspaceId, socket);
      }

      return new Promise<ChatMessage>((resolve, reject) => {
        socket.emit(
          "chat:message",
          { workspaceId, content, mentions },
          (response: unknown) => {
            const payload = response as { status?: string; message?: unknown } | undefined;

            if (payload?.status === "ok" && payload.message && typeof payload.message === "object") {
              const message = payload.message as ChatMessage;
              const normalized: ChatMessage = {
                ...message,
                workspaceId,
              };
              useChatStore.getState().receiveMessage(normalized, "outgoing");
              resolve(normalized);
              return;
            }

            const errorMessage =
              payload && typeof payload.message === "string"
                ? payload.message
                : MESSAGE_ERROR_GENERIC;
            reject(new Error(errorMessage));
          }
        );
      });
    },
    [autoJoin, workspaceId]
  );

  const hasMore = useMemo(() => !historyComplete && !!nextCursor, [historyComplete, nextCursor]);
  const isLoadingOlder = isHistoryLoading && historyMode === "older";

  return {
    workspaceId,
    messages,
    connectionStatus,
    isHistoryLoading,
    isLoadingOlder,
    loadHistory,
    hasMore,
    sendMessage,
    unreadCount,
    isJoined,
    error: chatError,
  };
}
