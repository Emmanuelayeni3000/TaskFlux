"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Loader2, MessageCircleWarning, Send, WifiOff } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceChat } from "@/hooks/useWorkspaceChat";
import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { cn } from "@/lib/utils";

const CONNECTION_LABELS: Record<string, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Disconnected",
  error: "Connection error",
};

const CONNECTION_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  idle: "outline",
  connecting: "outline",
  connected: "secondary",
  disconnected: "outline",
  error: "destructive",
};

const formatDayLabel = (date: Date) => {
  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return format(date, "EEEE, MMM d");
};

const formatTimeLabel = (date: Date) => format(date, "HH:mm");

export function ChatPanel() {
  const workspace = useCurrentWorkspace();
  const currentUser = useAuthStore((state) => state.user);
  const [composer, setComposer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    connectionStatus,
    isHistoryLoading,
    isLoadingOlder,
    loadHistory,
    hasMore,
    sendMessage,
    workspaceId,
    error,
  } = useWorkspaceChat({ markActive: true });

  const canSend = useMemo(
    () => connectionStatus === "connected" && composer.trim().length > 0 && !isSending,
    [composer, connectionStatus, isSending]
  );

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    if (isLoadingOlder) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isLoadingOlder]);

  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder) {
      return;
    }

    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const success = await loadHistory("older");

    if (success && container) {
      requestAnimationFrame(() => {
        if (!container) {
          return;
        }
        const delta = container.scrollHeight - previousHeight;
        container.scrollTop = delta;
      });
    }
  }, [hasMore, isLoadingOlder, loadHistory]);

  const handleSend = useCallback(async () => {
    const content = composer.trim();
    if (!content || !workspaceId || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(content, []);
      setComposer("");
      if (scrollRef.current) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    } catch (sendError) {
      console.error("[Chat] Failed to send message", sendError);
    } finally {
      setIsSending(false);
    }
  }, [composer, isSending, sendMessage, workspaceId]);

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  if (!workspace || workspace.type !== "team") {
    return (
      <Card className="border-taskflux-light-gray/70 bg-white/90">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageCircleWarning className="h-10 w-10 text-taskflux-cool-gray" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-taskflux-slate-navy">Team chat unavailable</h3>
            <p className="text-sm text-taskflux-cool-gray">
              Switch to a team workspace to collaborate in real time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const connectionLabel = CONNECTION_LABELS[connectionStatus] ?? connectionStatus;
  const connectionVariant = CONNECTION_VARIANTS[connectionStatus] ?? "outline";
  const showConnectionWarning = connectionStatus === "disconnected" || connectionStatus === "error";

  let lastDayKey = "";

  return (
    <Card className="flex h-full max-h-[calc(100vh-8rem)] flex-col border-taskflux-light-gray/70 bg-white/95 shadow-lg">
      <CardHeader className="border-b border-taskflux-light-gray/60 bg-white/70 backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-taskflux-slate-navy">
              {workspace.name}
            </CardTitle>
            <p className="text-sm text-taskflux-cool-gray">
              Real-time updates with everyone in this workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connectionVariant} className="capitalize">
              {connectionLabel}
            </Badge>
            {showConnectionWarning && <WifiOff className="h-4 w-4 text-taskflux-red" />}
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-taskflux-red/30 bg-taskflux-red/5 px-3 py-2 text-sm text-taskflux-red">
            {error}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
        <div className="flex items-center justify-center p-3">
          {hasMore ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs"
              onClick={() => {
                void handleLoadOlder();
              }}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </span>
              ) : (
                "Load earlier messages"
              )}
            </Button>
          ) : (
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-taskflux-cool-gray">
              Beginning of history
            </span>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-6">
          {messages.length === 0 && !isHistoryLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <MessageCircleWarning className="h-10 w-10 text-taskflux-cool-gray" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-taskflux-slate-navy">No messages yet</p>
                <p className="text-sm text-taskflux-cool-gray">
                  Start the conversation with your teammates.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const timestamp = new Date(message.createdAt);
              const dayKey = timestamp.toDateString();
              const displayName =
                (message.author.firstName || message.author.lastName)
                  ? `${message.author.firstName ?? ""} ${message.author.lastName ?? ""}`.trim()
                  : message.author.username ?? message.author.email;
              const initials = displayName
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0]?.toUpperCase())
                .slice(0, 2)
                .join("") || "?";
              const isOwn = message.author.id === currentUser?.id;
              const showDayDivider = dayKey !== lastDayKey;
              if (showDayDivider) {
                lastDayKey = dayKey;
              }

              return (
                <div key={message.id} className="mb-4">
                  {showDayDivider && (
                    <div className="mb-3 flex items-center gap-3 text-xs text-taskflux-cool-gray">
                      <span className="flex-1 border-t border-taskflux-light-gray/70" aria-hidden />
                      <span>{formatDayLabel(timestamp)}</span>
                      <span className="flex-1 border-t border-taskflux-light-gray/70" aria-hidden />
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-start gap-3",
                      isOwn && "flex-row-reverse text-right"
                    )}
                  >
                    <Avatar className="h-10 w-10 border border-taskflux-light-gray/60">
                      <AvatarFallback className="bg-taskflux-sky-blue/10 text-taskflux-sky-blue">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl border border-taskflux-light-gray/60 bg-white/90 px-4 py-3 shadow-sm",
                        isOwn && "bg-taskflux-sky-blue/10"
                      )}
                    >
                      <div className={cn("flex items-center gap-2 text-xs text-taskflux-cool-gray", isOwn && "justify-end")}
                      >
                        <span className="font-medium capitalize text-taskflux-slate-navy/80">{displayName}</span>
                        <span>{formatTimeLabel(timestamp)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line break-words text-sm text-taskflux-slate-navy">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-taskflux-light-gray/60 bg-white/80 p-4">
          <div className="rounded-2xl border border-taskflux-light-gray/70 bg-white/90 p-3 shadow-sm">
            <Textarea
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Write a message…"
              className="border-none bg-transparent text-sm focus-visible:ring-0"
              rows={3}
              disabled={connectionStatus !== "connected"}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-taskflux-cool-gray">
                Press Enter to send · Shift + Enter for a new line
              </p>
              <Button onClick={() => void handleSend()} disabled={!canSend} size="sm" className="rounded-full px-4">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
