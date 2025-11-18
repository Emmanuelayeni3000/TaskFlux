"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MailPlus, Shield } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { workspaceFetch } from "@/lib/workspace-request";
import { useCurrentWorkspace } from "@/store/workspaceStore";

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

type InviteRole = "member" | "admin" | "viewer";

const ROLE_OPTIONS: Array<{ value: InviteRole; label: string; description: string }> = [
  {
    value: "member",
    label: "Member",
    description: "Can collaborate on tasks and projects",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Manage members and workspace settings",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to workspace",
  },
];

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

export function InviteMemberModal({ open, onOpenChange, onInvited }: InviteMemberModalProps) {
  const workspace = useCurrentWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return EMAIL_REGEX.test(email) && Boolean(workspace) && !isSubmitting;
  }, [email, workspace, isSubmitting]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace || !EMAIL_REGEX.test(email)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await workspaceFetch(
        `/workspaces/${workspace.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role }),
        },
        {
          includeQueryParam: false,
          workspaceId: workspace.id,
        }
      );

      if (!response.ok) {
        let message = "Failed to send invitation";
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to default message
        }
        throw new Error(message);
      }

      setSuccessMessage("Invitation sent successfully");
      onInvited?.();
    } catch (inviteError) {
      const message = inviteError instanceof Error ? inviteError.message : "Failed to send invitation";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden bg-white border border-taskflux-light-gray/70 p-0">
        <form onSubmit={handleSubmit} className="flex h-full max-h-[90vh] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-taskflux-slate-navy">
              <MailPlus className="h-5 w-5 text-taskflux-sky-blue" />
              Invite a teammate
            </DialogTitle>
            <DialogDescription className="text-taskflux-cool-gray">
              Send an invitation to join {workspace?.name ?? "this workspace"}. People must already have a TaskFlux account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium text-taskflux-slate-navy">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20"
              required
            />
            <p className="text-xs text-taskflux-cool-gray">
              We&apos;ll notify them immediately after the invite is sent.
            </p>
          </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-taskflux-slate-navy flex items-center gap-2">
                <Shield className="h-4 w-4 text-taskflux-sky-blue" />
                Workspace role
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
                <SelectTrigger className="border-taskflux-light-gray px-4 py-6 focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-taskflux-light-gray">
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-sm font-medium text-taskflux-slate-navy">{option.label}</span>
                        <span className="text-xs text-taskflux-cool-gray">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive" className="border-taskflux-red/40 bg-taskflux-red/5">
                <AlertTitle>Could not send invite</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-taskflux-sky-blue/40 bg-taskflux-sky-blue/10">
                <AlertTitle>Invitation sent</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-taskflux-light-gray/60 bg-white px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-taskflux-light-gray text-taskflux-cool-gray hover:bg-taskflux-pale-gray"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover text-black"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MailPlus className="h-4 w-4" />
                  Send invite
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
