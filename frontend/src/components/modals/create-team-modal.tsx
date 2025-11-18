"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Mail, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { workspaceFetch } from "@/lib/workspace-request";
import { useWorkspaceStore, normalizeWorkspace, type WorkspaceResponse, type Workspace } from "@/store/workspaceStore";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be less than 100 characters"),
  inviteEmails: z.string().optional(),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (workspace: Workspace) => void;
}

export function CreateTeamModal({ trigger, open, onOpenChange, onSuccess }: CreateTeamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTags, setEmailTags] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const { addWorkspace } = useWorkspaceStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      inviteEmails: "",
    },
  });

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && isValidEmail(email) && !emailTags.includes(email)) {
      const newTags = [...emailTags, email];
      setEmailTags(newTags);
      setEmailInput("");
      setValue("inviteEmails", newTags.join(","));
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const newTags = emailTags.filter(email => email !== emailToRemove);
    setEmailTags(newTags);
    setValue("inviteEmails", newTags.join(","));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const onSubmit = async (data: CreateTeamFormData) => {
    setIsSubmitting(true);

    try {
      const response = await workspaceFetch("/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          type: "team",
          inviteEmails: emailTags.length > 0 ? emailTags : undefined,
        }),
      }, {
        workspaceId: null,
        includeQueryParam: false,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create team");
      }

      const payload = (await response.json()) as { workspace?: WorkspaceResponse };
      if (!payload.workspace) {
        throw new Error("Invalid response from server");
      }

      const newWorkspace = normalizeWorkspace(payload.workspace);
      addWorkspace(newWorkspace);
      
      // Reset form
      reset();
      setEmailTags([]);
      setEmailInput("");
      
      // Close modal
      onOpenChange?.(false);
      
      // Call success callback
      onSuccess?.(newWorkspace);

    } catch (error) {
      console.error("Failed to create team:", error);
      // You could add error handling here with a toast or error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      reset();
      setEmailTags([]);
      setEmailInput("");
    }
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] bg-white border border-taskflux-light-gray/70">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-taskflux-slate-navy">
            <Users className="h-5 w-5 text-taskflux-sky-blue" />
            Create New Team
          </DialogTitle>
          <DialogDescription className="text-taskflux-cool-gray">
            Create a new team workspace and optionally invite team members to collaborate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-taskflux-slate-navy">
              Team Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g., Marketing Team, Product Development"
              {...register("name")}
              className="border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20"
            />
            {errors.name && (
              <p className="text-sm text-taskflux-red">{errors.name.message}</p>
            )}
          </div>

          {/* Invite Team Members */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-taskflux-slate-navy flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite Team Members (Optional)
            </Label>
            <p className="text-xs text-taskflux-cool-gray">
              Add email addresses to invite team members. Press Enter or comma to add each email.
            </p>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter email address"
                  className="flex-1 border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20"
                />
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={!emailInput.trim() || !isValidEmail(emailInput.trim())}
                  className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {emailTags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-taskflux-pale-gray rounded-md">
                  {emailTags.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 bg-taskflux-sky-blue/10 text-taskflux-sky-blue hover:bg-taskflux-sky-blue/20"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-taskflux-red transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="border-taskflux-light-gray text-taskflux-cool-gray hover:bg-taskflux-pale-gray"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-lg shadow-taskflux-sky-blue/25 hover:shadow-taskflux-sky-blue/45 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating Team...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Create Team
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}