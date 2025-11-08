"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceProjects, type Project } from "@/hooks/use-workspace-projects";
import { useWorkspaceTasks, type WorkspaceTask } from "@/hooks/use-workspace-tasks";

type CalendarEventType = "project" | "task";

interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  status: string;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

// Helper function to get events for a specific date
const getEventsForDate = (date: Date, projects: Project[], tasks: WorkspaceTask[]): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  // Add project events (start/end dates)
  projects.forEach((project) => {
    const projectName = project.title ?? (project as { name?: string | null }).name ?? "Project";
    if (project.startDate && isSameDay(date, parseISO(project.startDate))) {
      events.push({
        id: project.id,
        title: `${projectName} (Start)`,
        type: "project",
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        description: project.description ?? null,
      });
    }
    if (project.endDate && isSameDay(date, parseISO(project.endDate))) {
      events.push({
        id: project.id,
        title: `${projectName} (End)`,
        type: "project",
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        description: project.description ?? null,
      });
    }
  });

  // Add task events (due dates)
  tasks.forEach((task) => {
    if (task.dueDate && isSameDay(date, parseISO(task.dueDate))) {
      events.push({
        id: task.id,
        title: task.title,
        type: "task",
        status: task.status,
        dueDate: task.dueDate,
        description: task.description ?? null,
      });
    }
  });

  return events;
};

// Event popover component
function EventPopover({ events, date }: { events: CalendarEvent[]; date: Date }) {
  if (events.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full h-full text-left">
          <div className="space-y-1">
            {events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={`text-xs px-2 py-1 rounded text-white truncate ${
                  event.type === 'project'
                    ? event.title.includes('Start')
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                    : event.status === 'DONE'
                    ? 'bg-gray-500'
                    : 'bg-orange-500'
                }`}
              >
                {event.title}
              </div>
            ))}
            {events.length > 3 && (
              <div className="text-xs text-gray-500">+{events.length - 3} more</div>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{format(date, 'MMMM d, yyyy')}</span>
          </div>
          
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border-l-2 border-gray-200 pl-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm">{event.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {event.type === 'project' ? event.status : event.status}
                  </Badge>
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {event.type === 'project' ? (
                    <>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>Project</span>
                      </div>
                      {event.startDate && event.endDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(parseISO(event.startDate), 'MMM d')} - {format(parseISO(event.endDate), 'MMM d')}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Task</span>
                      </div>
                      {event.dueDate && (
                        <span>Due {format(parseISO(event.dueDate), 'MMM d, h:mm a')}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { projects, isLoading: projectsLoading } = useWorkspaceProjects();
  const { tasks, isLoading: tasksLoading } = useWorkspaceTasks();

  const isLoading = projectsLoading || tasksLoading;

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const days = [];
    
    let day = start;
    while (day <= end) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    
    return days;
  }, [currentDate]);

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendar</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-96 flex items-center justify-center">
              <div className="text-center space-y-4">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-gray-500">Loading calendar...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div {...fadeInProps} className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-taskflux-slate-navy">Calendar</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      </motion.div>

      {/* Calendar */}
      <motion.div {...fadeInProps} className="space-y-6">
        <Card className="border-taskflux-light-gray/70 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-taskflux-slate-navy">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Header row */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-gray-500 border-b"
                >
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day) => {
                const events = getEventsForDate(day, projects, tasks);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border border-gray-100 ${
                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    } ${isDayToday ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isDayToday ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    
                    {events.length > 0 && isCurrentMonth && (
                      <EventPopover events={events} date={day} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-taskflux-slate-navy">
              Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Project Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Project End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Task Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-sm">Completed Task</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}