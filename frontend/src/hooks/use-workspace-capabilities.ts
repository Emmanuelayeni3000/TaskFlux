import { useMemo } from "react";

import {
  getWorkspaceCapabilities,
  type CapabilityOverrides,
  type WorkspaceCapabilities,
} from "@/lib/workspace-permissions";
import { useCurrentWorkspace } from "@/store/workspaceStore";

export function useWorkspaceCapabilities(
  overrides?: CapabilityOverrides
): WorkspaceCapabilities {
  const workspace = useCurrentWorkspace();

  return useMemo(
    () => getWorkspaceCapabilities(workspace?.role ?? "member", overrides, workspace?.type),
    [workspace?.role, workspace?.type, overrides]
  );
}
