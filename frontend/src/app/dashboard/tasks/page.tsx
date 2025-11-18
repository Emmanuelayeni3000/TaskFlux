"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Transition } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Filter,
  MoreHorizontal,
  Plus,
  SortAsc,
  Clock,
  Play,
  Archive,
  CheckCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardChrome } from "../_components/dashboard-chrome";
import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import { useWorkspaceTasks, type WorkspaceTask } from "@/hooks/use-workspace-tasks";
import { TaskModal } from "@/components/modals/task-modal";
import { useTaskRefreshStore } from "@/store/taskRefreshStore";

import { workspaceFetch } from "@/lib/workspace-request";



const easeOutCurve: [number, number, number, number] = [0.16, 1, 0.3, 1];
const baseTransition: Transition = { duration: 0.45, ease: easeOutCurve };
const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const lanes = [
  { title: "Backlog", accent: "taskflux-sky-blue", description: "Ideas and intake requests awaiting triage.", status: "TODO" },
  { title: "In Progress", accent: "taskflux-emerald", description: "Active work owned by the team right now.", status: "IN_PROGRESS" },
  { title: "Completed", accent: "taskflux-cool-gray", description: "Recently shipped wins.", status: "DONE" },
  { title: "Archived", accent: "taskflux-red", description: "Archived or cancelled items.", status: "ARCHIVED" },
];

export default function TasksPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const currentWorkspace = useCurrentWorkspace();
  const capabilities = useWorkspaceCapabilities();
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useWorkspaceTasks();
  const triggerRefresh = useTaskRefreshStore((state) => state.triggerRefresh);
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleTaskStatusChange = async (task: WorkspaceTask, newStatus: string) => {
    try {
      await workspaceFetch(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      });
      triggerRefresh();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const canCreateTasks = capabilities.canCreateTasks;
  const workspaceBadge = currentWorkspace
    ? `${currentWorkspace.name} · ${currentWorkspace.type === "team" ? "Team" : "Personal"}`
    : "Task Command Center";
  const heroTitle = currentWorkspace && currentWorkspace.type === "team"
    ? `Keep ${currentWorkspace.name} aligned across every sprint.`
    : "Stay ahead of every sprint commitment.";
  const heroDescription = currentWorkspace && currentWorkspace.type === "team"
    ? "Prioritise the work that matters for this team, resolve blockers faster, and make status updates effortless with TaskFlux automations."
    : "Prioritise the work that matters, resolve blockers faster, and make status updates effortless with TaskFlux automations.";

  const taskAnalytics = useMemo(() => {
    if (!tasks.length) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0,
        onTrackPercentage: 0,
        atRisk: 0,
      };
    }

    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === "DONE").length;
    const inProgress = tasks.filter(task => task.status === "IN_PROGRESS").length;
    const overdue = tasks.filter(task => {
      if (!task.dueDate || task.status === "DONE") return false;
      return new Date(task.dueDate) < now;
    }).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTrackPercentage = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
    const atRisk = overdue;

    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate,
      onTrackPercentage,
      atRisk,
    };
  }, [tasks]);

  const organizedTasks = useMemo(() => {
    const tasksByStatus: Record<string, WorkspaceTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      ARCHIVED: [],
      DONE: [],
    };

    tasks.forEach(task => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });

    return tasksByStatus;
  }, [tasks]);

  return (
    <DashboardChrome activeHref="/dashboard/tasks" onLogout={handleLogout}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-10">
        <motion.div {...fadeInProps} transition={baseTransition}>
          <div className="relative overflow-hidden rounded-3xl border border-taskflux-light-gray/60 bg-white shadow-lg shadow-taskflux-sky-blue/10">
            <div className="absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/20 via-white to-taskflux-emerald/10" />
            <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4 md:max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-taskflux-sky-blue">
                  {workspaceBadge}
                </span>
                <h1 className="text-3xl font-bold text-taskflux-slate-navy md:text-4xl">{heroTitle}</h1>
                <p className="text-base text-taskflux-cool-gray md:text-lg">{heroDescription}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-taskflux-slate-navy/80">
                  {tasksLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-taskflux-sky-blue" />
                      Loading task analytics...
                    </span>
                  ) : tasksError ? (
                    <span className="inline-flex items-center gap-2 text-taskflux-red">
                      <span className="h-2 w-2 rounded-full bg-taskflux-red" />
                      Error loading tasks
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-taskflux-emerald" />
                        {taskAnalytics.onTrackPercentage}% of tasks on track
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-taskflux-amber" />
                        {taskAnalytics.atRisk} at risk
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/75 p-6 shadow-inner">
                <div className="flex items-center justify-between text-sm text-taskflux-slate-navy/80">
                  <span className="font-semibold">Task Summary</span>
                  <span className="rounded-full bg-taskflux-sky-blue/10 px-2 py-0.5 text-xs font-medium text-taskflux-sky-blue">
                    {taskAnalytics.total} total
                  </span>
                </div>
                <div className="space-y-2 text-sm text-taskflux-cool-gray">
                  {tasksLoading ? (
                    <p>• Loading workspace tasks...</p>
                  ) : tasksError ? (
                    <p className="text-taskflux-red">• Error: {tasksError}</p>
                  ) : taskAnalytics.total === 0 ? (
                    <p>• No tasks yet. Create your first one!</p>
                  ) : (
                    <>
                      <p>• {taskAnalytics.completed} completed ({taskAnalytics.completionRate}%)</p>
                      <p>• {taskAnalytics.inProgress} in progress</p>
                      {taskAnalytics.overdue > 0 && <p>• {taskAnalytics.overdue} overdue</p>}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {canCreateTasks ? (
                    <TaskModal
                      trigger={
                        <Button className="flex-1 rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/25 transition-all hover:scale-[1.02]">
                          <Plus className="mr-2 h-4 w-4" />
                          New task
                        </Button>
                      }
                    />
                  ) : (
                    <Button
                      className="flex-1 cursor-not-allowed opacity-60 rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/25"
                      disabled
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New task
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy hover:bg-taskflux-pale-gray">
                    View automations
                  </Button>
                </div>
                {!canCreateTasks && (
                  <p className="text-xs text-taskflux-cool-gray/80">
                    You have read-only access in this workspace. Ask an admin for task creation rights.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeInProps} transition={{ ...baseTransition, delay: 0.05 }}>
          <div className="flex flex-col gap-6 rounded-3xl border border-taskflux-light-gray/60 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" className="rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy hover:bg-taskflux-pale-gray">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                <Button variant="outline" className="rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy hover:bg-taskflux-pale-gray">
                  <SortAsc className="mr-2 h-4 w-4" />
                  Sort by priority
                </Button>
                <Button variant="ghost" className="rounded-full text-taskflux-sky-blue hover:bg-taskflux-sky-blue/10">
                  Saved views
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-taskflux-cool-gray">
                {tasksLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-taskflux-sky-blue" />
                    Loading...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-taskflux-sky-blue" />
                      {taskAnalytics.total} total
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-taskflux-emerald" />
                      {taskAnalytics.completed} completed
                    </span>
                    {taskAnalytics.overdue > 0 && (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-taskflux-red" />
                        {taskAnalytics.overdue} overdue
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {lanes.map((lane) => (
                <TaskLane 
                  key={lane.title} 
                  {...lane} 
                  tasks={organizedTasks[lane.status] || []}
                  isLoading={tasksLoading}
                  error={tasksError}
                  onRefresh={refetchTasks}
                  onTaskEdit={(task) => {
                    setSelectedTask(task);
                    setIsEditModalOpen(true);
                  }}
                  onTaskStatusChange={handleTaskStatusChange}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Edit Task Modal */}
      <TaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        task={selectedTask || undefined}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </DashboardChrome>
  );
}

type Lane = {
  title: string;
  accent: string;
  description: string;
  status: string;
  tasks: WorkspaceTask[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onTaskEdit: (task: WorkspaceTask) => void;
  onTaskStatusChange: (task: WorkspaceTask, newStatus: string) => void;
};

function TaskLane({ title, accent, description, tasks, isLoading, error, onTaskEdit, onTaskStatusChange }: Lane) {

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-taskflux-light-gray/60 bg-white/95 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-taskflux-cool-gray">{title}</h2>
          <p className="text-sm text-taskflux-cool-gray/80">{description}</p>
        </div>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `rgb(var(--${accent}))` }}
          aria-hidden
        />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-taskflux-light-gray/70 bg-white/95 p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-3/4 rounded bg-taskflux-light-gray/60" />
                  <div className="h-3 w-full rounded bg-taskflux-light-gray/40" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-taskflux-light-gray/40" />
                    <div className="h-5 w-20 rounded-full bg-taskflux-light-gray/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-taskflux-red/20 bg-taskflux-red/5 p-6 text-center">
            <p className="text-sm text-taskflux-red">Error loading tasks</p>
            <p className="text-xs text-taskflux-cool-gray">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-taskflux-light-gray/70 bg-taskflux-pale-gray/50 px-4 py-6 text-sm text-taskflux-cool-gray">
            No tasks yet. Drag an item here or create a new one.
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={onTaskEdit}
              onStatusChange={onTaskStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: WorkspaceTask;
  onStatusChange: (task: WorkspaceTask, newStatus: string) => void;
  onEdit: (task: WorkspaceTask) => void;
};

function TaskCard({ task, onStatusChange, onEdit }: TaskCardProps) {
  const isCompleted = task.status === "DONE";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
  
  const priorityColors = {
    LOW: "taskflux-cool-gray",
    MEDIUM: "taskflux-sky-blue", 
    HIGH: "taskflux-amber",
    CRITICAL: "taskflux-red"
  };
  
  const statusColors = {
    TODO: "taskflux-cool-gray",
    IN_PROGRESS: "taskflux-emerald",
    DONE: "taskflux-sky-blue",
    ARCHIVED: "taskflux-red"
  };

  const statusOptions = [
    { value: "TODO", label: "To Do", icon: Clock, color: "taskflux-cool-gray" },
    { value: "IN_PROGRESS", label: "In Progress", icon: Play, color: "taskflux-emerald" },
    { value: "DONE", label: "Done", icon: CheckCheck, color: "taskflux-sky-blue" },
    { value: "ARCHIVED", label: "Archived", icon: Archive, color: "taskflux-red" },
  ];

  const badges = [];
  if (task.priority) {
    badges.push({
      label: task.priority.charAt(0) + task.priority.slice(1).toLowerCase(),
      color: priorityColors[task.priority]
    });
  }
  
  badges.push({
    label: task.status === "IN_PROGRESS" ? "In Progress" : 
           task.status === "ARCHIVED" ? "Archived" :
           task.status === "DONE" ? "Done" : "To Do",
    color: statusColors[task.status]
  });

  const meta = task.dueDate 
    ? `Due ${new Date(task.dueDate).toLocaleDateString()}`
    : `Updated ${new Date(task.updatedAt).toLocaleDateString()}`;

  const borderColor = isOverdue ? "taskflux-red" : priorityColors[task.priority || "MEDIUM"];

  return (
    <Card
      className={`cursor-pointer border border-taskflux-light-gray/70 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
        isCompleted ? "opacity-70" : ""
      }`}
      style={{ borderLeft: `4px solid rgb(var(--${borderColor}))` }}
      onClick={() => {
        onEdit(task);
      }}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className={`text-base font-semibold text-taskflux-slate-navy ${isCompleted ? "line-through" : ""}`}>
              {task.title}
            </h3>
            <p className={`text-sm text-taskflux-cool-gray/90 ${isCompleted ? "line-through" : ""}`}>
              {task.description || "No description provided"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-taskflux-cool-gray hover:text-taskflux-slate-navy"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white border border-taskflux-light-gray/70 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1.5 text-xs font-medium text-taskflux-cool-gray uppercase tracking-wider">
                Change Status
              </div>
              <DropdownMenuSeparator className="bg-taskflux-light-gray/30" />
              {statusOptions.map((status) => {
                const Icon = status.icon;
                const isCurrentStatus = task.status === status.value;
                
                return (
                  <DropdownMenuItem
                    key={status.value}
                    className={`flex items-center gap-2 px-2 py-2 text-sm cursor-pointer hover:bg-taskflux-pale-gray focus:bg-taskflux-pale-gray ${
                      isCurrentStatus ? "bg-taskflux-pale-gray" : ""
                    }`}
                    onClick={() => {
                      if (!isCurrentStatus) {
                        onStatusChange(task, status.value);
                      }
                    }}
                    disabled={isCurrentStatus}
                  >
                    <Icon 
                      className="h-4 w-4" 
                      style={{ color: `rgb(var(--${status.color}))` }}
                    />
                    <span className={isCurrentStatus ? "font-medium" : ""}>
                      {status.label}
                    </span>
                    {isCurrentStatus && (
                      <CheckCircle className="h-3 w-3 ml-auto text-taskflux-emerald" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {badges.map((badge) => (
            <span
              key={`${task.id}-${badge.label}`}
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: `rgba(var(--${badge.color}), 0.12)` as string,
                color: `rgb(var(--${badge.color}))` as string,
              }}
            >
              {badge.label}
            </span>
          ))}
          <span className="text-xs font-medium text-taskflux-cool-gray/80">{meta}</span>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 text-xs font-medium text-taskflux-emerald">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed
          </div>
        )}
        {isOverdue && (
          <div className="flex items-center gap-2 text-xs font-medium text-taskflux-red">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue
          </div>
        )}
      </CardContent>
    </Card>
  );
}