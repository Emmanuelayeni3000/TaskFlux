"use client";

import { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceTasks, type TaskStatus, type TaskPriority } from "@/hooks/use-workspace-tasks";
import { useWorkspaceProjects, type Project } from "@/hooks/use-workspace-projects";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { workspaceFetch } from "@/lib/workspace-request";
import { format } from "date-fns";

interface TaskModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority?: TaskPriority | null;
    dueDate?: string | null;
    projectId?: string | null;
  };
  onSuccess?: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | undefined;
  projectId: string | null;
}

export function TaskModal({ trigger, open: externalOpen, onOpenChange, task, onSuccess }: TaskModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "TODO",
    priority: task?.priority || "MEDIUM",
    dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    projectId: task?.projectId || null,
  });

  console.log("🔄 TaskModal: Component rendered", {
    externalOpen,
    internalOpen,
    open,
    loading,
    taskId: task?.id,
    formData,
    hasOnSuccess: !!onSuccess,
    hasTrigger: !!trigger
  });

  const { refetch } = useWorkspaceTasks();
  const { projects } = useWorkspaceProjects();
  const currentWorkspace = useCurrentWorkspace();
  const workspaceReady = Boolean(currentWorkspace?.id);
  const isTeamWorkspace = currentWorkspace?.type === "team";

  useEffect(() => {
    if (!isTeamWorkspace && formData.projectId) {
      setFormData((prev) => ({ ...prev, projectId: null }));
    }
  }, [isTeamWorkspace, formData.projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("🚀 TaskModal: handleSubmit called", { 
      event: e.type, 
      formData, 
      taskId: task?.id,
      currentWorkspace: currentWorkspace?.id 
    });
    
    e.preventDefault();
    
    if (!currentWorkspace) {
      console.error("❌ TaskModal: No current workspace found");
      return;
    }

    console.log("⏳ TaskModal: Starting task operation, setting loading to true");
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        projectId: isTeamWorkspace ? formData.projectId : null,
      };

      console.log("📦 TaskModal: Payload prepared", payload);

      let response;
      
      if (task?.id) {
        console.log("🔄 TaskModal: Updating existing task", task.id);
        response = await workspaceFetch(`/tasks/${task.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        console.log("✅ TaskModal: Update response", response);
      } else {
        console.log("🆕 TaskModal: Creating new task");
        response = await workspaceFetch("/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        console.log("✅ TaskModal: Create response", response);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error("❌ TaskModal: Request failed", errorData);
        throw new Error(errorData.message || 'Failed to save task');
      }

      const responseData = await response.json();
      console.log("📥 TaskModal: Response data", responseData);

      console.log("🔄 TaskModal: Refetching tasks");
      await refetch();
      
      console.log("🎉 TaskModal: Calling onSuccess callback");
      onSuccess?.();
      
      console.log("🚪 TaskModal: Closing modal");
      setOpen(false);
      
      // Reset form for new task
      if (!task?.id) {
        console.log("🧹 TaskModal: Resetting form data");
        setFormData({
          title: "",
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: undefined,
          projectId: null,
        });
      }
      
      console.log("✅ TaskModal: Operation completed successfully");
    } catch (error) {
      console.error("❌ TaskModal: Failed to save task:", error);
      console.error("❌ TaskModal: Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      console.log("🏁 TaskModal: Setting loading to false");
      setLoading(false);
    }
  };

  const updateFormData = <T extends keyof TaskFormData>(field: T, value: TaskFormData[T]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const defaultTrigger = (
    <Button className="rounded-full">
      <Plus className="mr-2 h-4 w-4" />
      New Task
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(trigger || (externalOpen === undefined)) && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
  <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {task?.id ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {task?.id ? "Update the task details below." : "Fill out the form below to create a new task."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!workspaceReady && (
            <div className="rounded-md border border-dashed border-taskflux-light-gray/60 bg-taskflux-pale-gray/60 px-3 py-2 text-xs text-taskflux-cool-gray">
              Workspace context is loading. You can create tasks once we finish syncing data.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Task title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData("title", e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData("description", e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as TaskPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isTeamWorkspace && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.projectId || "none"}
                  onValueChange={(value) => updateFormData("projectId", value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projects.length ? "Select a project (optional)" : "No projects yet"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project: Project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? (
                    format(formData.dueDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => updateFormData("dueDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title.trim() || !workspaceReady}
              onClick={(e) => {
                console.log("🖱️ TaskModal: Button clicked", {
                  buttonType: "submit",
                  loading,
                  titleTrimmed: formData.title.trim(),
                  titleLength: formData.title.trim().length,
                  disabled: loading || !formData.title.trim() || !workspaceReady,
                  eventType: e.type,
                  currentTarget: e.currentTarget.tagName
                });
                
                if (!formData.title.trim()) {
                  console.warn("⚠️ TaskModal: Preventing submit - empty title");
                  e.preventDefault();
                  return;
                }

                if (!workspaceReady) {
                  console.warn("⚠️ TaskModal: Preventing submit - workspace not ready");
                  e.preventDefault();
                  return;
                }
                
                console.log("✅ TaskModal: Button click allowed, form will submit");
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading 
                ? (task?.id ? "Updating..." : "Creating...") 
                : (task?.id ? "Update Task" : "Create Task")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}