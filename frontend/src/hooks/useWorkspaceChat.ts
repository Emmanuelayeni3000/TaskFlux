import { useCallback, useEffect, useMemo } from "react";
import { io, type Socket } from "socket.io-client";

import { workspaceFetch } from "@/lib/workspace-request";
import { useAuthStore } from "@/store/authStore";
import { useChatStore, type ChatMessage, type ChatMessageType } from "@/store/chatStore";
import { useTeamWorkspaces, useWorkspaceStore } from "@/store/workspaceStore";

let socketInstance: Socket | null = null;
let listenersAttached = false;

type ChatStoreState = ReturnType<typeof useChatStore.getState>;

const selectMessages = (state: ChatStoreState) => state.messages;
const selectHistoryLoading = (state: ChatStoreState) => state.historyLoading;
const selectHistoryMode = (state: ChatStoreState) => state.historyMode;
const selectNextCursor = (state: ChatStoreState) => state.nextCursor;
const selectHistoryComplete = (state: ChatStoreState) => state.historyComplete;
const selectUnreadCounts = (state: ChatStoreState) => state.unreadCounts;
const selectJoinedWorkspaces = (state: ChatStoreState) => state.joinedWorkspaces;
const selectConnectionStatus = (state: ChatStoreState) => state.connectionStatus;
const selectChatError = (state: ChatStoreState) => state.error;

const SOCKET_ERROR_GENERIC = "Unable to connect to team chat";
const HISTORY_ERROR_GENERIC = "Unable to load chat history";
const MESSAGE_ERROR_GENERIC = "Unable to send message";

export type SendWorkspaceChatMessageInput = {
  content?: string;
  mentions?: Array<{ userId: string; username: string }>;
  type?: ChatMessageType;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
  attachmentDurationMs?: number | null;
};

export const resolveSocketUrl = () => {
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

let currentSocketId: string | null = null;

const attachSocketListeners = () => {
  console.log('[Chat] attachSocketListeners called', {
    hasSocketInstance: !!socketInstance,
    listenersAttached
  });

  if (!socketInstance || listenersAttached) {
    console.log('[Chat] Skipping listener attachment');
    return;
  }

  console.log('[Chat] Attaching socket listeners');
  listenersAttached = true;

  socketInstance.on("connect", () => {
    console.log('[Chat] Socket connected');
    useChatStore.getState().setConnectionStatus("connected");
    useChatStore.getState().setError(null);

    const socketIdChanged = currentSocketId !== socketInstance?.id;
    currentSocketId = socketInstance?.id ?? null;

    if (socketIdChanged) {
      console.log('[Chat] Socket id changed, rejoining workspaces');
      useChatStore.setState({ joinedWorkspaces: {} });

      const workspaceState = useWorkspaceStore.getState();
      const rejoinTargets = workspaceState.workspaces.filter((workspace) => workspace.type === "team");

      for (const workspace of rejoinTargets) {
        if (!socketInstance) {
          break;
        }
  void joinWorkspaceRoom(workspace.id, socketInstance, true);
      }
    }
  });

  socketInstance.on("disconnect", (reason) => {
    console.log('[Chat] Socket disconnected', { reason });
    useChatStore.getState().setConnectionStatus("disconnected");
  });

  socketInstance.io.on("reconnect_attempt", (attempt) => {
    console.log('[Chat] Socket reconnection attempt', { attempt });
    useChatStore.getState().setConnectionStatus("connecting");
  });

  socketInstance.on("connect_error", (error) => {
    console.error("[Chat] Socket connection error", error);
    useChatStore.getState().setConnectionStatus("error");
    useChatStore.getState().setError(error?.message ?? SOCKET_ERROR_GENERIC);
  });

  socketInstance.on("chat:message", (payload: ChatMessage) => {
    console.log('[Chat] Received chat:message event', {
      messageId: payload?.id,
      workspaceId: payload?.workspaceId,
      hasContent: !!payload?.content
    });

    if (!payload?.workspaceId) {
      console.log('[Chat] Ignoring message - no workspaceId');
      return;
    }

    console.log('[Chat] Processing incoming message', payload.id);
    useChatStore.getState().receiveMessage({
      ...payload,
      createdAt: payload.createdAt,
      workspaceId: payload.workspaceId,
    }, "incoming");
  });
};

const ensureSocket = (token: string) => {
  console.log('[Chat] ensureSocket called', { hasToken: !!token });
  
  const url = resolveSocketUrl();
  console.log('[Chat] Socket URL resolved', { url });
  
  if (!url) {
    console.error('[Chat] No socket URL configured');
    useChatStore.getState().setConnectionStatus("error");
    useChatStore.getState().setError("Socket URL not configured");
    return null;
  }

  if (!socketInstance) {
    console.log('[Chat] Creating new socket instance', { url });
    socketInstance = io(url, {
      transports: ["websocket"],
      autoConnect: false,
      withCredentials: true,
    });
  }

  socketInstance.auth = { token };
  console.log('[Chat] Socket auth set');

  if (!socketInstance.connected) {
    console.log('[Chat] Connecting socket');
    useChatStore.getState().setConnectionStatus("connecting");
    socketInstance.connect();
  } else {
    console.log('[Chat] Socket already connected');
  }

  attachSocketListeners();
  return socketInstance;
};

const joinWorkspaceRoom = (workspaceId: string, socket: Socket, force = false) => {
  console.log('[Chat] joinWorkspaceRoom called', { workspaceId });
  
  const store = useChatStore.getState();
  if (store.joinedWorkspaces[workspaceId] && !force) {
    console.log('[Chat] Already joined workspace room', workspaceId);
    return Promise.resolve(true);
  }

  if (force && store.joinedWorkspaces[workspaceId]) {
    console.log('[Chat] Forcing rejoin of workspace', workspaceId);
    useChatStore.getState().setWorkspaceJoined(workspaceId, false);
  }

  console.log('[Chat] Emitting chat:join event', { workspaceId });
  return new Promise<boolean>((resolve, reject) => {
    socket.emit("chat:join", { workspaceId }, (response: unknown) => {
      console.log('[Chat] chat:join response received', { workspaceId, response });
      
      const payload = response as { status?: string; message?: string } | undefined;

      if (payload?.status === "ok") {
        console.log('[Chat] Successfully joined workspace room', workspaceId);
        useChatStore.getState().setWorkspaceJoined(workspaceId, true);
        resolve(true);
        return;
      }

      const message = (payload && typeof payload.message === "string")
        ? payload.message
        : "Unable to join chat room";
      useChatStore.getState().setError(message);
      reject(new Error(message));
    });
  });
};

export function useChatConnection() {
  const token = useAuthStore((state) => state.token);
  const teamWorkspaces = useTeamWorkspaces();

  useEffect(() => {
    console.log('[useChatConnection] Effect triggered', {
      hasToken: !!token,
      teamWorkspacesCount: teamWorkspaces.length
    });

    if (!token) {
      console.log('[useChatConnection] No token - cleaning up connection');
      useChatStore.getState().setConnectionStatus("idle");
      if (socketInstance) {
        console.log('[useChatConnection] Disconnecting existing socket');
        socketInstance.disconnect();
        socketInstance = null;
        listenersAttached = false;
        currentSocketId = null;
      }
      return;
    }

    const socket = ensureSocket(token);
    if (!socket) {
      console.log('[useChatConnection] Failed to ensure socket');
      return;
    }

    console.log('[useChatConnection] Joining team workspace rooms', {
      count: teamWorkspaces.length
    });

    for (const workspace of teamWorkspaces) {
      console.log('[useChatConnection] Joining workspace room', workspace.id);
  void joinWorkspaceRoom(workspace.id, socket);
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

  console.log('[useWorkspaceChat] Hook initialized', {
    workspaceId,
    currentWorkspaceId,
    autoJoin,
    autoLoadHistory,
    markActive,
    hasToken: !!token
  });

  useChatConnection();

  const messagesMap = useChatStore(selectMessages);
  const historyLoadingMap = useChatStore(selectHistoryLoading);
  const historyModeMap = useChatStore(selectHistoryMode);
  const nextCursorMap = useChatStore(selectNextCursor);
  const historyCompleteMap = useChatStore(selectHistoryComplete);
  const unreadCountsMap = useChatStore(selectUnreadCounts);
  const joinedWorkspacesMap = useChatStore(selectJoinedWorkspaces);
  const storeConnectionStatus = useChatStore(selectConnectionStatus);
  const storeError = useChatStore(selectChatError);

  const connectionStatus = autoJoin ? storeConnectionStatus : "disconnected";
  const messages = workspaceId && autoJoin ? messagesMap[workspaceId] ?? [] : [];
  const isHistoryLoading = workspaceId && autoJoin ? historyLoadingMap[workspaceId] ?? false : false;
  const historyMode = workspaceId && autoJoin ? historyModeMap[workspaceId] ?? null : null;
  const nextCursor = workspaceId && autoJoin ? nextCursorMap[workspaceId] ?? null : null;
  const historyComplete = workspaceId && autoJoin ? historyCompleteMap[workspaceId] ?? false : false;
  const unreadCount = workspaceId && autoJoin ? unreadCountsMap[workspaceId] ?? 0 : 0;
  const isJoined = workspaceId && autoJoin ? !!joinedWorkspacesMap[workspaceId] : false;
  const chatError = autoJoin ? storeError : null;

  useEffect(() => {
    console.log('[useWorkspaceChat] Main effect triggered', {
      workspaceId,
      hasToken: !!token,
      autoJoin,
      markActive
    });

    if (!workspaceId || !token || !autoJoin) {
      console.log('[useWorkspaceChat] Skipping effect - missing requirements', {
        hasWorkspaceId: !!workspaceId,
        hasToken: !!token,
        autoJoin
      });
      return;
    }

    const socket = ensureSocket(token);
    if (!socket) {
      console.log('[useWorkspaceChat] Failed to ensure socket');
      return;
    }

    console.log('[useWorkspaceChat] Joining workspace room', workspaceId);
  void joinWorkspaceRoom(workspaceId, socket);

    if (markActive) {
      console.log('[useWorkspaceChat] Marking workspace active', workspaceId);
      useChatStore.getState().markWorkspaceActive(workspaceId);
    }

    return () => {
      if (markActive && useChatStore.getState().activeWorkspaceId === workspaceId) {
        console.log('[useWorkspaceChat] Cleaning up - marking workspace inactive', workspaceId);
        useChatStore.getState().markWorkspaceActive(null);
      }
    };
  }, [autoJoin, markActive, token, workspaceId]);

  const loadHistory = useCallback(
    async (mode: "initial" | "older" = "initial") => {
      console.log('[useWorkspaceChat] loadHistory called', {
        mode,
        workspaceId,
        autoJoin
      });

      if (!workspaceId || !autoJoin) {
        console.log('[useWorkspaceChat] loadHistory skipped - requirements not met', {
          hasWorkspaceId: !!workspaceId,
          autoJoin
        });
        return false;
      }

      const chatState = useChatStore.getState();
      if (chatState.historyLoading[workspaceId]) {
        console.log('[useWorkspaceChat] loadHistory skipped - already loading', workspaceId);
        return false;
      }

      if (mode === "older" && chatState.historyComplete[workspaceId]) {
        console.log('[useWorkspaceChat] loadHistory skipped - history complete', workspaceId);
        return false;
      }

      const cursor = mode === "older" ? chatState.nextCursor[workspaceId] : undefined;
      if (mode === "older" && !cursor) {
        chatState.markHistoryComplete(workspaceId);
        return false;
      }

      console.log('[useWorkspaceChat] Starting history load', {
        workspaceId,
        mode,
        cursor,
        hasHistoryComplete: chatState.historyComplete[workspaceId]
      });

      chatState.setHistoryLoading(workspaceId, true, mode);

      try {
        const params = new URLSearchParams();
        if (mode === "older" && cursor) {
          params.set("cursor", cursor);
        }

        const url = `/workspaces/${workspaceId}/chat/messages${params.toString() ? `?${params.toString()}` : ""}`;
        console.log('[useWorkspaceChat] Fetching chat history', { url, workspaceId });

        const response = await workspaceFetch(
          url,
          undefined,
          {
            workspaceId,
            includeQueryParam: false,
          }
        );

        console.log('[useWorkspaceChat] Chat history response', {
          status: response.status,
          ok: response.ok,
          workspaceId
        });

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
          console.error('[useWorkspaceChat] Failed to load chat history', {
            status: response.status,
            message,
            workspaceId
          });
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

        console.log('[useWorkspaceChat] Processing chat history', {
          messageCount: formatted.length,
          nextCursor: data.nextCursor,
          mode,
          workspaceId
        });

        useChatStore.getState().mergeMessages(
          workspaceId,
          formatted,
          mode === "older" ? "prepend" : "replace"
        );

        useChatStore.getState().setHistoryCursor(workspaceId, data.nextCursor ?? null);
        if (!data.nextCursor) {
          console.log('[useWorkspaceChat] History loading complete for workspace', workspaceId);
          useChatStore.getState().markHistoryComplete(workspaceId);
        }

        console.log('[useWorkspaceChat] History load successful', workspaceId);
        return true;
      } catch (error) {
        const fallback = error instanceof Error ? error.message : HISTORY_ERROR_GENERIC;
        console.error('[useWorkspaceChat] Error loading chat history', {
          error: fallback,
          workspaceId,
          mode
        });
        useChatStore.getState().setError(fallback);
        return false;
      } finally {
        console.log('[useWorkspaceChat] History loading finished', workspaceId);
        useChatStore.getState().setHistoryLoading(workspaceId, false, null);
      }
    },
    [workspaceId, autoJoin]
  );

  useEffect(() => {
    console.log('[useWorkspaceChat] Auto-load history effect triggered', {
      workspaceId,
      autoLoadHistory,
      autoJoin,
      messagesLength: messages.length,
      isHistoryLoading,
      historyComplete
    });

    if (!workspaceId || !autoLoadHistory || !autoJoin) {
      console.log('[useWorkspaceChat] Skipping auto-load - requirements not met', {
        hasWorkspaceId: !!workspaceId,
        autoLoadHistory,
        autoJoin
      });
      return;
    }

    if (historyComplete) {
      console.log('[useWorkspaceChat] Skipping auto-load - history already complete', {
        historyComplete
      });
      return;
    }

    if (messages.length > 0 || isHistoryLoading) {
      console.log('[useWorkspaceChat] Skipping auto-load - already have data or loading', {
        messagesLength: messages.length,
        isHistoryLoading
      });
      return;
    }

    console.log('[useWorkspaceChat] Scheduling initial history load', workspaceId);
    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      console.log('[useWorkspaceChat] Executing delayed initial history load', workspaceId);
      void loadHistory("initial");
    }, 100);

    return () => {
      console.log('[useWorkspaceChat] Clearing auto-load timeout', workspaceId);
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadHistory, autoJoin, historyComplete, isHistoryLoading, messages.length, workspaceId]);

  const sendMessage = useCallback(
    async ({
      content = "",
      mentions = [],
      type,
      attachmentUrl,
      attachmentMimeType,
      attachmentDurationMs,
    }: SendWorkspaceChatMessageInput = {}): Promise<ChatMessage> => {
      const trimmedContent = content.trim();
      const resolvedType: ChatMessageType = type
        ?? (attachmentUrl
          ? attachmentMimeType?.startsWith("audio/")
            ? "AUDIO"
            : "IMAGE"
          : "TEXT");

      console.log('[useWorkspaceChat] sendMessage called', {
        contentLength: trimmedContent.length,
        workspaceId,
        autoJoin,
        mentionsCount: mentions.length,
        attachmentUrl,
        attachmentMimeType,
        attachmentDurationMs,
        resolvedType,
      });

      if (!workspaceId || !autoJoin) {
        console.log('[useWorkspaceChat] sendMessage rejected - chat not available', {
          hasWorkspaceId: !!workspaceId,
          autoJoin,
        });
        return Promise.reject(new Error("Chat not available"));
      }

      if (resolvedType === "TEXT" && trimmedContent.length === 0) {
        console.log('[useWorkspaceChat] sendMessage rejected - empty text message');
        return Promise.reject(new Error("Message content required"));
      }

      if (resolvedType !== "TEXT" && !attachmentUrl) {
        console.log('[useWorkspaceChat] sendMessage rejected - attachment missing');
        return Promise.reject(new Error("Attachment required"));
      }

      const tokenValue = useAuthStore.getState().token;
      if (!tokenValue) {
        console.log('[useWorkspaceChat] sendMessage rejected - no auth token');
        return Promise.reject(new Error("Authentication required"));
      }

      const socket = ensureSocket(tokenValue);
      if (!socket) {
        console.log('[useWorkspaceChat] sendMessage rejected - no socket');
        return Promise.reject(new Error(SOCKET_ERROR_GENERIC));
      }

      if (autoJoin) {
        console.log('[useWorkspaceChat] Ensuring workspace room joined before sending', workspaceId);
        try {
          await joinWorkspaceRoom(workspaceId, socket);
        } catch (error) {
          console.error('[useWorkspaceChat] Failed to join workspace before sending', {
            workspaceId,
            error
          });
          throw error instanceof Error ? error : new Error("Unable to join chat room");
        }
      }

      const payload: {
        workspaceId: string;
        content?: string | null;
        mentions: typeof mentions;
        type: ChatMessageType;
        attachmentUrl?: string;
        attachmentMimeType?: string;
        attachmentDurationMs?: number;
      } = {
        workspaceId,
        mentions,
        type: resolvedType,
      };

      if (trimmedContent.length > 0) {
        payload.content = trimmedContent;
      }

      if (attachmentUrl) {
        payload.attachmentUrl = attachmentUrl;
      }

      if (attachmentMimeType) {
        payload.attachmentMimeType = attachmentMimeType;
      }

      if (typeof attachmentDurationMs === "number" && Number.isFinite(attachmentDurationMs)) {
        payload.attachmentDurationMs = attachmentDurationMs;
      }

      return new Promise<ChatMessage>((resolve, reject) => {
        socket.emit(
          "chat:message",
          payload,
          (response: unknown) => {
            const messageResponse = response as { status?: string; message?: unknown } | undefined;

            if (messageResponse?.status === "ok" && messageResponse.message && typeof messageResponse.message === "object") {
              const message = messageResponse.message as ChatMessage;
              const normalized: ChatMessage = {
                ...message,
                workspaceId,
              };
              useChatStore.getState().receiveMessage(normalized, "outgoing");
              resolve(normalized);
              return;
            }

            const errorMessage =
              messageResponse && typeof messageResponse.message === "string"
                ? messageResponse.message
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
