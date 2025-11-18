"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Image as ImageIcon,
  Loader2,
  MessageCircleWarning,
  Mic,
  Send,
  StopCircle,
  WifiOff,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceChat, type SendWorkspaceChatMessageInput } from "@/hooks/useWorkspaceChat";
import { workspaceFetch } from "@/lib/workspace-request";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { ChatMessageType } from "@/store/chatStore";
import { useCurrentWorkspace } from "@/store/workspaceStore";

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

const CHAT_ATTACHMENT_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB
const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
const RECENT_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

type AttachmentDraft = {
  file: File;
  type: ChatMessageType;
  previewUrl: string | null;
  uploadUrl: string | null;
  mimeType: string | null;
  durationMs: number | null;
  uploading: boolean;
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

const formatDuration = (durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const resolveAudioMimeType = () => {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return undefined;
  }

  for (const candidate of AUDIO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

type ActiveMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  lastSeen: number;
  isSelf?: boolean;
};

const resolveInitials = (member: Pick<ActiveMember, "firstName" | "lastName" | "username">) => {
  const first = member.firstName?.trim().charAt(0);
  const last = member.lastName?.trim().charAt(0);
  if (first || last) {
    return `${first ?? ""}${last ?? ""}`.toUpperCase();
  }

  const usernameChunk = member.username?.trim().slice(0, 2);
  return (usernameChunk ?? "TF").toUpperCase();
};

const resolveDisplayName = (member: Pick<ActiveMember, "firstName" | "lastName" | "username">) => {
  const first = member.firstName?.trim();
  const last = member.lastName?.trim();
  if (first || last) {
    return [first, last].filter(Boolean).join(" ");
  }

  return member.username?.trim() || "Teammate";
};

export function ChatPanel() {
  const workspace = useCurrentWorkspace();
  const currentUser = useAuthStore((state) => state.user);
  const [composer, setComposer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

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

  const canSend = useMemo(() => {
    const readyStatus = ["connected", "connecting", "idle"].includes(connectionStatus);
    const trimmed = composer.trim();
    const hasText = trimmed.length > 0;
    const hasAttachmentReady = Boolean(attachment && attachment.uploadUrl && !attachment.uploading);

    return (
      readyStatus &&
      (hasText || hasAttachmentReady) &&
      !isSending &&
      !isRecording &&
      !attachment?.uploading
    );
  }, [attachment, composer, connectionStatus, isRecording, isSending]);

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      const target = scrollRef.current;
      if (!target) {
        return;
      }
      target.scrollTop = target.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (isLoadingOlder) {
      return;
    }
    scrollToLatest();
  }, [isLoadingOlder, messages.length, scrollToLatest]);

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

  const clearAttachment = useCallback(() => {
    setAttachment((previous) => {
      if (previous?.previewUrl && previous.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      return null;
    });
  }, []);

  const beginUpload = useCallback(
    async (input: File | Blob, type: ChatMessageType, durationMs?: number | null) => {
      if (!workspaceId) {
        setAttachmentError("Join a workspace to send attachments");
        return;
      }

      setAttachmentError(null);
      setSendError(null);

      if (attachment?.previewUrl && attachment.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      const baseFile =
        input instanceof File
          ? input
          : new File(
              [input],
              type === "AUDIO" ? "voice-note.webm" : "attachment",
              {
                type:
                  input.type ||
                  (type === "AUDIO" ? "audio/webm" : "application/octet-stream"),
              }
            );

      const previewUrl = URL.createObjectURL(baseFile);

      setAttachment({
        file: baseFile,
        type,
        previewUrl,
        uploadUrl: null,
        mimeType: baseFile.type || null,
        durationMs: durationMs ?? null,
        uploading: true,
      });

      try {
        const formData = new FormData();
        formData.append("attachment", baseFile);
        if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
          formData.append("durationMs", String(Math.max(0, Math.round(durationMs))));
        }

        const response = await workspaceFetch(
          `/workspaces/${workspaceId}/chat/uploads`,
          {
            method: "POST",
            body: formData,
          },
          {
            includeQueryParam: false,
            workspaceId,
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload && typeof payload.message === "string"
              ? payload.message
              : "Failed to upload attachment";
          throw new Error(message);
        }

        const payload = await response.json().catch(() => null);

        setAttachment((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            uploadUrl: typeof payload?.url === "string" ? payload.url : previous.uploadUrl,
            mimeType:
              typeof payload?.mimeType === "string"
                ? payload.mimeType
                : previous.mimeType,
            durationMs:
              typeof payload?.durationMs === "number"
                ? payload.durationMs
                : previous.durationMs,
            uploading: false,
          };
        });
      } catch (uploadError) {
        console.error("[ChatPanel] Attachment upload failed", uploadError);
        setAttachmentError(
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload attachment"
        );
        setAttachment((previous) => {
          if (previous?.previewUrl && previous.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previous.previewUrl);
          }
          return null;
        });
      }
    },
    [attachment, workspaceId]
  );

  const handleImageButtonClick = useCallback(() => {
    setAttachmentError(null);
    setSendError(null);
    if (!fileInputRef.current) {
      return;
    }
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }, []);

  const handleImageSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setAttachmentError("Only image files are supported");
        return;
      }

      if (file.size > CHAT_ATTACHMENT_SIZE_LIMIT) {
        setAttachmentError("Images must be 15MB or smaller");
        return;
      }

      await beginUpload(file, "IMAGE");
    },
    [beginUpload]
  );

  const handleAttachmentRemove = useCallback(() => {
    setAttachmentError(null);
    setSendError(null);
    clearAttachment();
  }, [clearAttachment]);

  const cleanupMediaResources = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      cleanupMediaResources();
      return;
    }

    if (recorder.state === "inactive") {
      cleanupMediaResources();
      return;
    }

    recorder.stop();
  }, [cleanupMediaResources]);

  const startRecording = useCallback(async () => {
    if (isRecording || attachment?.uploading) {
      return;
    }

    setAttachmentError(null);
    setSendError(null);

    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices) {
      setAttachmentError("Voice recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = resolveAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
  setRecordingDuration(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const duration =
          recordingStartedAtRef.current !== null
            ? Date.now() - recordingStartedAtRef.current
            : null;
        recordingStartedAtRef.current = null;

        const chunkType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recordedChunksRef.current, { type: chunkType });
        recordedChunksRef.current = [];

        cleanupMediaResources();

        if (blob.size === 0) {
          setAttachmentError("Voice recording was empty");
          return;
        }

        await beginUpload(blob, "AUDIO", duration ?? undefined);
      };

      recorder.start();
    } catch (recordError) {
      console.error("[ChatPanel] Unable to start recording", recordError);
      setAttachmentError("Unable to access the microphone");
      cleanupMediaResources();
    }
  }, [attachment?.uploading, beginUpload, cleanupMediaResources, isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      cleanupMediaResources();
    };
  }, [cleanupMediaResources]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (recordingStartedAtRef.current !== null) {
        setRecordingDuration(Date.now() - recordingStartedAtRef.current);
      }
    }, 150);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment]);

  const handleSend = useCallback(async () => {
    if (isSending || isRecording || attachment?.uploading) {
      console.log("[ChatPanel] handleSend aborted - busy state", {
        isSending,
        isRecording,
        attachmentUploading: attachment?.uploading,
      });
      return;
    }

    const trimmedComposer = composer.trim();
    const hasAttachmentReady = Boolean(attachment && attachment.uploadUrl && !attachment.uploading);

    if (!workspaceId) {
      console.warn("[ChatPanel] handleSend aborted - no workspaceId", {
        connectionStatus,
      });
      setSendError("Chat connection unavailable");
      return;
    }

    if (!trimmedComposer && !hasAttachmentReady) {
      console.log("[ChatPanel] handleSend aborted - nothing to send", {
        composerLength: trimmedComposer.length,
        hasAttachmentReady,
      });
      return;
    }

    const payload: SendWorkspaceChatMessageInput = {
      content: trimmedComposer,
    };

    if (hasAttachmentReady && attachment) {
      payload.type = attachment.type;
      if (attachment.uploadUrl) {
        payload.attachmentUrl = attachment.uploadUrl;
      }
      if (attachment.mimeType) {
        payload.attachmentMimeType = attachment.mimeType;
      }
      if (typeof attachment.durationMs === "number") {
        payload.attachmentDurationMs = attachment.durationMs;
      }
    }

    console.log("[ChatPanel] handleSend dispatching", {
      workspaceId,
      composerLength: trimmedComposer.length,
      hasAttachmentReady,
      hasAttachmentUploadUrl: payload.attachmentUrl,
      connectionStatus,
    });

    setIsSending(true);
    setSendError(null);

    try {
      await sendMessage(payload);

      console.log("[ChatPanel] Message sent successfully");
      setComposer("");
      if (hasAttachmentReady || attachment) {
        clearAttachment();
      }
      scrollToLatest();
    } catch (sendErr) {
      console.error("[ChatPanel] Failed to send message", sendErr);
      setSendError(
        sendErr instanceof Error ? sendErr.message : "Failed to deliver message. Please retry."
      );
    } finally {
      setIsSending(false);
    }
  }, [
    attachment,
    clearAttachment,
    composer,
    connectionStatus,
    isRecording,
    isSending,
    scrollToLatest,
    sendMessage,
    workspaceId,
  ]);

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!attachment?.uploading && !isRecording) {
          void handleSend();
        }
      }
    },
    [attachment?.uploading, handleSend, isRecording]
  );

  const connectionLabel = CONNECTION_LABELS[connectionStatus] ?? connectionStatus;
  const connectionVariant = CONNECTION_VARIANTS[connectionStatus] ?? "outline";
  const showConnectionWarning = connectionStatus === "disconnected" || connectionStatus === "error";

  const recentActiveMembers = useMemo<ActiveMember[]>(() => {
    if (messages.length === 0) {
      return [];
    }

    const now = Date.now();
    const seen = new Map<string, ActiveMember>();

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const author = message.author;
      if (!author?.id || seen.has(author.id)) {
        continue;
      }

      const timestamp = new Date(message.createdAt).getTime();
      if (!Number.isFinite(timestamp)) {
        continue;
      }

      if (now - timestamp > RECENT_ACTIVITY_WINDOW_MS) {
        continue;
      }

      seen.set(author.id, {
        id: author.id,
        firstName: author.firstName ?? null,
        lastName: author.lastName ?? null,
        username: author.username ?? null,
        lastSeen: timestamp,
      });
    }

    return Array.from(seen.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [messages]);

  const presenceMembers = useMemo<ActiveMember[]>(() => {
    if (!currentUser) {
      return recentActiveMembers;
    }

    const alreadyTracked = recentActiveMembers.some((member) => member.id === currentUser.id);
    if (alreadyTracked) {
      return recentActiveMembers;
    }

    return [
      {
        id: currentUser.id,
        firstName: currentUser.firstName ?? null,
        lastName: currentUser.lastName ?? null,
        username: currentUser.username ?? null,
        lastSeen: Date.now(),
        isSelf: true,
      },
      ...recentActiveMembers,
    ];
  }, [currentUser, recentActiveMembers]);

  const activePeerCount = presenceMembers.reduce(
    (count, member) => count + (member.isSelf ? 0 : 1),
    0
  );

  const recordingDurationLabel = formatDuration(recordingDuration);

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

  let lastDayKey = "";

  return (
  <Card className="flex h-full min-h-0 w-full flex-1 flex-col border-taskflux-light-gray/70 bg-white/95 shadow-lg">
  <CardHeader className="border-b border-taskflux-light-gray/60 bg-white/70 px-4 py-4 backdrop-blur">
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
        {presenceMembers.length > 0 ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex -space-x-3">
              {presenceMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="relative">
                  <Avatar
                    className="h-9 w-9 border border-white text-xs font-semibold text-taskflux-slate-navy shadow-sm"
                    title={`${resolveDisplayName(member)}${member.isSelf ? " (You)" : ""}`}
                  >
                    <AvatarFallback>{resolveInitials(member)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-taskflux-emerald" />
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-taskflux-cool-gray">
              {activePeerCount === 0
                ? "You're the only one active"
                : activePeerCount === 1
                  ? "1 teammate active now"
                  : `${activePeerCount} teammates active now`}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-taskflux-cool-gray">
            No teammates online in the last few minutes.
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-taskflux-red/30 bg-taskflux-red/5 px-3 py-2 text-sm text-taskflux-red">
            {error}
          </div>
        )}
      </CardHeader>
  <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-0">
    <div className="flex items-center justify-center px-4 py-1.5">
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
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
              const textContent = typeof message.content === "string" ? message.content : "";
              const hasText = textContent.trim().length > 0;
              const isImage = message.type === "IMAGE" && !!message.attachmentUrl;
              const isAudio = message.type === "AUDIO" && !!message.attachmentUrl;
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
                        "max-w-[75%] rounded-2xl border border-taskflux-light-gray/60 bg-white/95 px-4 py-3 shadow-sm",
                        isOwn && "bg-taskflux-sky-blue/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs text-taskflux-cool-gray",
                          isOwn && "justify-end"
                        )}
                      >
                        <span className="font-medium capitalize text-taskflux-slate-navy/80">
                          {displayName}
                        </span>
                        <span>{formatTimeLabel(timestamp)}</span>
                      </div>
                      {hasText ? (
                        <p className="mt-2 whitespace-pre-line break-words text-sm text-taskflux-slate-navy">
                          {textContent}
                        </p>
                      ) : null}
                      {isImage ? (
                        <div className="mt-3 inline-flex max-w-[220px] overflow-hidden rounded-2xl border border-taskflux-light-gray/70 bg-white/90 shadow-sm">
                          <Image
                            src={message.attachmentUrl ?? ""}
                            alt="Chat attachment"
                            width={720}
                            height={720}
                            className="h-auto max-h-48 w-full object-cover transition-transform duration-200 ease-out hover:scale-[1.02]"
                            sizes="(max-width: 768px) 70vw, 220px"
                          />
                        </div>
                      ) : null}
                      {isAudio ? (
                        <div className="mt-3 flex items-center gap-3 rounded-xl bg-taskflux-sky-blue/10 px-3 py-2 text-taskflux-slate-navy">
                          <audio
                            controls
                            src={message.attachmentUrl ?? undefined}
                            className="max-w-full"
                          />
                          {typeof message.attachmentDurationMs === "number" ? (
                            <span className="text-xs font-medium">
                              {formatDuration(message.attachmentDurationMs)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-taskflux-light-gray/60 bg-white/80 p-3">
          <div className="rounded-2xl border border-taskflux-light-gray/70 bg-white/95 p-2.5 shadow-sm">
              {isRecording ? (
                <div className="mb-2.5 flex items-center justify-between rounded-2xl border border-taskflux-sky-blue/50 bg-taskflux-sky-blue/10 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-taskflux-red" />
                    <span className="text-sm font-semibold text-taskflux-slate-navy">
                      Recording voice note…
                    </span>
                    <div className="hidden items-end gap-1 sm:flex">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          key={`recording-bar-${index}`}
                          className="w-1.5 rounded-full bg-taskflux-sky-blue/80 animate-bounce"
                          style={{
                            height: `${10 + index * 4}px`,
                            animationDelay: `${index * 0.12}s`,
                            animationDuration: "1s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-taskflux-slate-navy">
                    {recordingDurationLabel}
                  </span>
                </div>
              ) : null}
              {attachment ? (
                <div className="mb-2.5 flex flex-col gap-2.5 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-2.5 text-sm text-taskflux-slate-navy">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {attachment.type === "IMAGE" ? "Image attached" : "Voice note attached"}
                    </span>
                    <span className="text-xs text-taskflux-cool-gray">
                      {attachment.uploading ? "Uploading…" : "Ready to send"}
                    </span>
                  </div>
                  {attachment.type === "IMAGE" && attachment.previewUrl ? (
                    <div className="inline-flex max-w-[220px] overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm">
                      <Image
                        src={attachment.previewUrl}
                        alt="Selected image"
                        width={720}
                        height={720}
                        className="h-auto max-h-40 w-full object-cover"
                        sizes="(max-width: 768px) 70vw, 220px"
                      />
                    </div>
                  ) : null}
                  {attachment.type === "AUDIO" && attachment.previewUrl ? (
                    <div className="flex items-center justify-between gap-2.5 rounded-xl bg-white/80 px-3 py-2 text-sm">
                      <audio controls src={attachment.previewUrl} className="max-w-full" />
                      {typeof attachment.durationMs === "number" ? (
                        <span className="text-xs font-medium text-taskflux-cool-gray">
                          {formatDuration(attachment.durationMs)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {attachmentError ? (
                <div className="mb-2.5 rounded-2xl border border-taskflux-red/30 bg-taskflux-red/10 px-3 py-2 text-xs text-taskflux-red">
                  {attachmentError}
                </div>
              ) : null}
              {sendError ? (
                <div className="mb-2.5 rounded-2xl border border-taskflux-red/30 bg-taskflux-red/10 px-3 py-2 text-xs text-taskflux-red">
                  {sendError}
                </div>
              ) : null}
              <Textarea
                value={composer}
                onChange={(event) => {
                  setComposer(event.target.value);
                  if (sendError) {
                    setSendError(null);
                  }
                }}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write a message…"
                className="min-h-[44px] resize-none border-none bg-transparent text-sm leading-5 focus-visible:ring-0"
                rows={1}
                disabled={
                  connectionStatus === "error" ||
                  connectionStatus === "disconnected" ||
                  attachment?.uploading ||
                  isRecording
                }
              />
              <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-taskflux-cool-gray">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="rounded-full"
                      onClick={handleImageButtonClick}
                      disabled={
                        connectionStatus !== "connected" || attachment?.uploading || isRecording
                      }
                    >
                      <ImageIcon className="h-4 w-4 text-taskflux-slate-navy" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={isRecording ? "secondary" : "ghost"}
                      className="rounded-full"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={connectionStatus !== "connected" || attachment?.uploading}
                    >
                      {isRecording ? (
                        <StopCircle className="h-4 w-4 text-taskflux-red" />
                      ) : (
                        <Mic className="h-4 w-4 text-taskflux-slate-navy" />
                      )}
                    </Button>
                    {attachment ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        onClick={handleAttachmentRemove}
                        disabled={attachment.uploading}
                      >
                        <XCircle className="h-4 w-4 text-taskflux-red" />
                      </Button>
                    ) : null}
                  </div>
                  <span className="hidden sm:inline">
                    Press Enter to send · Shift + Enter for a new line
                  </span>
                </div>
                <Button
                  onClick={() => void handleSend()}
                  disabled={!canSend || attachment?.uploading || isRecording}
                  size="sm"
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-4 font-semibold text-white shadow-md shadow-indigo-400/30 transition hover:from-sky-600 hover:to-purple-600"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Send</span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelected}
              />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
