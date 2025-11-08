"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Transition } from "framer-motion";
import { AlertTriangle, CalendarCheck, CheckCircle, Clock, Plus, Sparkles, TrendingUp } from "lucide-react";
import { differenceInCalendarDays, isToday, isTomorrow, format, formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

import { useWorkspaceTasks } from "@/hooks/use-workspace-tasks";
import { TaskModal } from "@/components/modals/task-modal";

const easeOutCurve: [number, number, number, number] = [0.16, 1, 0.3, 1];
const baseTransition: Transition = { duration: 0.45, ease: easeOutCurve };
const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export function PersonalDashboard() {
  const user = useAuthStore((state) => state.user);
  const {
    tasks,
    isLoading: tasksLoading,
  } = useWorkspaceTasks();
  const [isHydrated, setIsHydrated] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const userName = isHydrated
    ? user?.firstName?.trim() || user?.email?.split("@")[0] || "there"
    : "there";
  const overviewDescription = "Review your progress, unblock teammates, and ship your priorities with confidence. Everything you need is organised below.";

  const taskAnalytics = useMemo(() => {
    if (tasks.length === 0) {
      return {
        total: 0,
        open: 0,
        overdue: 0,
        completedThisWeek: 0,
        completionRate: 0,
        upcoming: 0,
      };
    }

    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "DONE").length;
    const completedThisWeek = tasks.filter(
      (task) =>
        task.status === "DONE" &&
        differenceInCalendarDays(now, new Date(task.updatedAt)) <= 7
    ).length;
    const overdue = tasks.filter((task) => {
      if (!task.dueDate) {
        return false;
      }
      const due = new Date(task.dueDate);
      return due < now && task.status !== "DONE" && task.status !== "ARCHIVED";
    }).length;
    const open = tasks.filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED").length;
    const upcoming = tasks.filter((task) => {
      if (!task.dueDate) {
        return false;
      }
      const due = new Date(task.dueDate);
      const diff = differenceInCalendarDays(due, now);
      return diff >= 0 && diff <= 7 && task.status !== "DONE" && task.status !== "ARCHIVED";
    }).length;

    const completionRate = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

    return {
      total,
      open,
      overdue,
      completedThisWeek,
      completionRate,
      upcoming,
    };
  }, [tasks]);

  const focusTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => {
        if (task.status === "DONE" || task.status === "ARCHIVED") {
          return false;
        }
        if (!task.dueDate) {
          return true;
        }
        const due = new Date(task.dueDate);
        return due <= now;
      })
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.NEGATIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.NEGATIVE_INFINITY;
        return aDue - bDue;
      })
      .slice(0, 4);
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => {
        if (!task.dueDate) {
          return false;
        }
        const due = new Date(task.dueDate);
        const diff = differenceInCalendarDays(due, now);
        return diff >= 0 && diff <= 7 && task.status !== "DONE" && task.status !== "ARCHIVED";
      })
      .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime())
      .slice(0, 4);
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status === "DONE")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks]);

  if (tasksLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-8">
      <motion.section
        {...fadeInProps}
        className="relative overflow-hidden rounded-3xl border border-taskflux-light-gray/70 bg-gradient-to-br from-taskflux-sky-blue/15 via-white to-taskflux-emerald/10 p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-taskflux-sky-blue/30 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-sky-blue">
              <Sparkles className="h-3 w-3" />
              Personal Workspace
            </div>
            <h1 className="text-3xl font-bold text-taskflux-slate-navy md:text-4xl">
              Welcome back, {userName}!
            </h1>
            <p className="max-w-xl text-taskflux-cool-gray">
              {overviewDescription}
            </p>
            <div className="flex flex-wrap gap-3">
              <TaskModal
                open={taskModalOpen}
                onOpenChange={setTaskModalOpen}
                trigger={
                  <Button className="rounded-full bg-taskflux-sky-blue px-5 hover:bg-taskflux-blue-hover">
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                }
                onSuccess={() => setTaskModalOpen(false)}
              />
              <Link href="/dashboard/tasks">
                <Button variant="outline" className="rounded-full border-taskflux-light-gray/80">
                  Review tasks
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg md:max-w-xs">
            <div>
              <p className="text-xs uppercase tracking-widest text-taskflux-cool-gray/70">Open</p>
              <p className="text-2xl font-semibold text-taskflux-slate-navy">{taskAnalytics.open}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-taskflux-cool-gray/70">Due Soon</p>
              <p className="text-2xl font-semibold text-taskflux-slate-navy">{taskAnalytics.upcoming}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-taskflux-cool-gray/70">Completed</p>
              <p className="text-2xl font-semibold text-taskflux-slate-navy">{taskAnalytics.completedThisWeek}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-taskflux-cool-gray/70">Overdue</p>
              <p className={`text-2xl font-semibold ${taskAnalytics.overdue ? "text-taskflux-red" : "text-taskflux-slate-navy"}`}>
                {taskAnalytics.overdue}
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-taskflux-sky-blue/20 blur-3xl" />
      </motion.section>

      <motion.section
        {...fadeInProps}
        transition={{ ...baseTransition, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-3"
      >
        <Card className="border-taskflux-light-gray/70 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">Today&apos;s Focus</CardTitle>
            <CalendarCheck className="h-4 w-4 text-taskflux-sky-blue" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-taskflux-cool-gray">
            <p className="text-3xl font-semibold text-taskflux-slate-navy">{focusTasks.length}</p>
            <p>Tasks either due or waiting for your next move.</p>
            <Link href="/dashboard/tasks" className="text-xs font-semibold text-taskflux-sky-blue hover:text-taskflux-blue-hover">
              Jump to task board →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-taskflux-emerald" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-taskflux-cool-gray">
            <p className="text-3xl font-semibold text-taskflux-slate-navy">{taskAnalytics.completionRate}%</p>
            <p>{taskAnalytics.completedThisWeek} completed in the last 7 days.</p>
            <p className="text-xs text-taskflux-cool-gray/80">Total tasks: {taskAnalytics.total}</p>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-taskflux-amber" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-taskflux-cool-gray">
            <p className="text-3xl font-semibold text-taskflux-slate-navy">{taskAnalytics.upcoming}</p>
            <p>Due within the next 7 days.</p>
            <p className="text-xs text-taskflux-cool-gray/80">Overdue: {taskAnalytics.overdue}</p>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        {...fadeInProps}
        transition={{ ...baseTransition, delay: 0.2 }}
        className="grid gap-8 lg:grid-cols-2"
      >
        <Card className="border-taskflux-light-gray/70 bg-white/95">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-taskflux-slate-navy">Focus List</CardTitle>
              <p className="text-sm text-taskflux-cool-gray">What matters most right now.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-taskflux-sky-blue hover:text-taskflux-blue-hover" onClick={() => setTaskModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {focusTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-taskflux-light-gray/70 bg-taskflux-pale-gray/40 p-6 text-center text-sm text-taskflux-cool-gray">
                Nothing urgent. Use this space to plan your next move.
              </div>
            ) : (
              focusTasks.map((task) => {
                const dueLabel = task.dueDate
                  ? isToday(new Date(task.dueDate))
                    ? "Due today"
                    : format(new Date(task.dueDate), "MMM d")
                  : "No due date";

                return (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/30 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-taskflux-slate-navy">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-taskflux-cool-gray/90 line-clamp-2">{task.description}</p>
                      )}
                      <p className="text-xs text-taskflux-cool-gray/80">{dueLabel}</p>
                    </div>
                    {task.status === "DONE" ? (
                      <CheckCircle className="mt-1 h-5 w-5 text-taskflux-emerald" />
                    ) : (
                      <AlertTriangle className={`mt-1 h-5 w-5 ${task.dueDate ? "text-taskflux-amber" : "text-taskflux-cool-gray/70"}`} />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-taskflux-slate-navy">Upcoming This Week</CardTitle>
            <p className="text-sm text-taskflux-cool-gray">Stay ahead of commitments.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-taskflux-light-gray/70 bg-taskflux-pale-gray/40 p-6 text-center text-sm text-taskflux-cool-gray">
                No upcoming deadlines. Schedule time for deep work.
              </div>
            ) : (
              upcomingTasks.map((task) => {
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const label = dueDate
                  ? isToday(dueDate)
                    ? "Today"
                    : isTomorrow(dueDate)
                      ? "Tomorrow"
                      : format(dueDate, "EEE, MMM d")
                  : "No due date";

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/20 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-taskflux-slate-navy">{task.title}</p>
                      <p className="text-xs text-taskflux-cool-gray/80">{label}</p>
                    </div>
                    <CalendarCheck className="h-5 w-5 text-taskflux-sky-blue" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        {...fadeInProps}
        transition={{ ...baseTransition, delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-taskflux-slate-navy">Recently Completed</h2>
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="sm" className="text-taskflux-sky-blue hover:text-taskflux-blue-hover">
              View task history
            </Button>
          </Link>
        </div>
        <Card className="border-taskflux-light-gray/70 bg-white/95">
          <CardContent className="space-y-3 p-6">
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-taskflux-cool-gray">
                <CheckCircle className="h-8 w-8 text-taskflux-cool-gray/60" />
                <p>No completed tasks yet. Check items off to see them here.</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-taskflux-light-gray/50 bg-taskflux-pale-gray/20 p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-taskflux-slate-navy">{task.title}</p>
                    <p className="text-xs text-taskflux-cool-gray">Completed {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-taskflux-emerald" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}