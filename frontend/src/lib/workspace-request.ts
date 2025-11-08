import { useCallback } from "react";

import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace, useWorkspaceStore } from "@/store/workspaceStore";

export const WORKSPACE_HEADER_KEY = "x-workspace-id";
export const WORKSPACE_QUERY_PARAM = "workspaceId";

export type WorkspaceRequestOptions = {
  workspaceId?: string | null;
  includeQueryParam?: boolean;
  queryParamKey?: string;
  headerKey?: string | null;
  includeAuthorization?: boolean;
};

export type WorkspaceFetchOptions = WorkspaceRequestOptions & {
  signal?: AbortSignal;
};

export function getCurrentWorkspaceId(): string | undefined {
  const { currentWorkspaceId } = useWorkspaceStore.getState();
  return currentWorkspaceId || undefined;
}

export function appendWorkspaceContext(
  url: string,
  { workspaceId, includeQueryParam = true, queryParamKey = WORKSPACE_QUERY_PARAM }: WorkspaceRequestOptions
): string {
  if (!workspaceId) {
    return url;
  }

  if (!includeQueryParam) {
    return url;
  }

  const base = url.startsWith("http")
    ? undefined
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost";

  const target = new URL(url, base);
  target.searchParams.set(queryParamKey, workspaceId);

  if (url.startsWith("http")) {
    return target.toString();
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function withWorkspaceHeaders(
  init: RequestInit = {},
  { workspaceId, headerKey = WORKSPACE_HEADER_KEY }: WorkspaceRequestOptions
): RequestInit {
  if (!workspaceId || !headerKey) {
    return init;
  }

  const headers = new Headers(init.headers ?? {});
  headers.set(headerKey, workspaceId);

  return {
    ...init,
    headers,
  };
}

function withAuthorization(init: RequestInit = {}, includeAuthorization = true): RequestInit {
  if (!includeAuthorization) {
    return init;
  }

  const token = useAuthStore.getState().token;
  if (!token) {
    return init;
  }

  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  return {
    ...init,
    headers,
  };
}

function resolveRequestUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return input;
  }

  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const trimmedPath = input.startsWith("/") ? input.slice(1) : input;

  return `${trimmedBase}/${trimmedPath}`;
}

export async function workspaceFetch(
  input: string,
  init: RequestInit = {},
  options: WorkspaceFetchOptions = {}
): Promise<Response> {
  const workspaceId =
    options.workspaceId !== undefined ? options.workspaceId : getCurrentWorkspaceId();
  const resolvedInput = resolveRequestUrl(input);
  const url = appendWorkspaceContext(resolvedInput, {
    workspaceId,
    includeQueryParam: options.includeQueryParam,
    queryParamKey: options.queryParamKey,
  });
  const requestWithWorkspace = withWorkspaceHeaders(
    {
      ...init,
      signal: options.signal ?? init.signal,
    },
    {
      workspaceId,
      headerKey: options.headerKey,
    }
  );
  const requestWithAuth = withAuthorization(
    requestWithWorkspace,
    options.includeAuthorization
  );

  return fetch(url, requestWithAuth);
}

export function useWorkspaceFetch(defaults: WorkspaceRequestOptions = {}) {
  const workspace = useCurrentWorkspace();

  return useCallback(
    (input: string, init?: RequestInit, overrides?: WorkspaceFetchOptions) =>
      workspaceFetch(input, init, {
        workspaceId: workspace?.id,
        ...defaults,
        ...overrides,
      }),
    [workspace?.id, defaults]
  );
}
