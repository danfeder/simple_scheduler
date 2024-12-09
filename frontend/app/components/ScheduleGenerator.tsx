"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { scheduleApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';
import { Schedule, ScheduledClass } from '../../../shared/types/schedule';
import WeeklySchedule from './WeeklySchedule';
import UnscheduledClasses from './UnscheduledClasses';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function ScheduleGenerator() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [generating, setGenerating] = useState(false);
  const [unscheduledClasses, setUnscheduledClasses] = useState<ScheduledClass[]>([]);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setUnscheduledClasses(schedule.classes.filter(c => c.dayOfWeek === 0));
    }
  }, [schedule]);

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const generateSchedule = async () => {
    if (!startDate) {
      toast({
        title: 'Error',
        description: 'Please select a start date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      const { scheduleId } = await scheduleApi.generate(startDate);
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          const status = await scheduleApi.getStatus(scheduleId);
          
          if (status.state === 'completed') {
            const newSchedule = await scheduleApi.get(scheduleId);
            setSchedule(newSchedule);
            clearInterval(interval);
            setGenerating(false);
            toast({
              title: 'Success',
              description: 'Schedule generated successfully',
            });
          } else if (status.state === 'failed') {
            clearInterval(interval);
            setGenerating(false);
            toast({
              title: 'Error',
              description: status.error || 'Failed to generate schedule',
              variant: 'destructive',
            });
          }
        } catch (error) {
          clearInterval(interval);
          setGenerating(false);
          toast({
            title: 'Error',
            description: 'Failed to check generation status',
            variant: 'destructive',
          });
        }
      }, 2000);

      setPollInterval(interval);
    } catch (error) {
      setGenerating(false);
      toast({
        title: 'Error',
        description: 'Failed to start schedule generation',
        variant: 'destructive',
      });
    }
  };

  const optimizeSchedule = async () => {
    if (!schedule) return;

    try {
      setGenerating(true);
      const optimizedSchedule = await scheduleApi.optimize(schedule.metadata.version);
      setSchedule(optimizedSchedule);
      toast({
        title: 'Success',
        description: 'Schedule optimized successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to optimize schedule',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || !schedule) return;

    console.log('=== Drag Operation Started ===');
    console.log('Source:', source.droppableId);
    console.log('Destination:', destination.droppableId);
    console.log('Class ID:', draggableId);

    const parseDropId = (dropId: string) => {
      const [dayStr, periodStr] = dropId.split('-');
      const result = {
        day: parseInt(dayStr),
        period: parseInt(periodStr)
      };
      console.log('Parsed drop ID:', dropId, 'Result:', result);
      return result;
    };

    try {
      // Moving between schedule slots
      if (source.droppableId !== 'unscheduled' && destination.droppableId !== 'unscheduled') {
        console.log('Moving between schedule slots');
        const destPos = parseDropId(destination.droppableId);
        const sourcePos = parseDropId(source.droppableId);

        console.log('Checking conflicts...');
        const conflicts = await scheduleApi.checkConflicts(
          schedule.metadata.version,
          draggableId,
          destPos.day,
          destPos.period
        );

        if (conflicts.hasConflicts) {
          console.log('Conflict detected! Cancelling move.');
          toast({
            title: "Scheduling Conflict",
            description: "This time slot conflicts with existing classes",
            variant: "destructive",
          });
          return;
        }

        console.log('Updating class position...');
        const updatedSchedule = await scheduleApi.updateClass(
          schedule.metadata.version,
          draggableId,
          { dayOfWeek: destPos.day, period: destPos.period }
        );
        console.log('Schedule updated successfully');
        setSchedule(updatedSchedule);
        return;
      }

      // Moving to unscheduled area
      if (destination.droppableId === 'unscheduled') {
        console.log('Moving class to unscheduled area');
        const sourcePos = parseDropId(source.droppableId);
        const classToUnschedule = schedule.classes.find(c => c.id === draggableId);
        if (!classToUnschedule) {
          console.log('Class not found!', draggableId);
          return;
        }

        console.log('Unscheduling class...');
        const updatedSchedule = await scheduleApi.unscheduleClass(
          schedule.metadata.version,
          draggableId
        );

        console.log('Updating states...');
        setSchedule(updatedSchedule);
        setUnscheduledClasses(prev => {
          const newState = [...prev, {
            ...classToUnschedule,
            originalDayOfWeek: sourcePos.day,
            originalPeriod: sourcePos.period
          }];
          console.log('New unscheduled classes:', newState);
          return newState;
        });
        return;
      }

      // Moving from unscheduled to schedule
      if (source.droppableId === 'unscheduled') {
        console.log('Moving from unscheduled to schedule');
        const destPos = parseDropId(destination.droppableId);

        console.log('Checking conflicts...');
        const conflicts = await scheduleApi.checkConflicts(
          schedule.metadata.version,
          draggableId,
          destPos.day,
          destPos.period
        );

        if (conflicts.hasConflicts) {
          console.log('Conflict detected! Cancelling move.');
          toast({
            title: "Scheduling Conflict",
            description: "This time slot conflicts with existing classes",
            variant: "destructive",
          });
          return;
        }

        console.log('Updating class position...');
        const updatedSchedule = await scheduleApi.updateClass(
          schedule.metadata.version,
          draggableId,
          { dayOfWeek: destPos.day, period: destPos.period }
        );

        console.log('Updating states...');
        setSchedule(updatedSchedule);
        setUnscheduledClasses(prev => {
          const newState = prev.filter(c => c.id !== draggableId);
          console.log('New unscheduled classes:', newState);
          return newState;
        });
        return;
      }
    } catch (error) {
      console.error('Operation failed:', error);
      toast({
        title: "Error",
        description: "Failed to update class schedule",
        variant: "destructive",
      });
    }
    console.log('=== Drag Operation Completed ===');
  };

  const handleUndoUnschedule = async (classItem: ScheduledClass) => {
    console.log('=== Undo Unschedule Started ===');
    console.log('Class:', classItem);

    if (!schedule || !classItem.originalDayOfWeek || !classItem.originalPeriod) {
      console.log('Missing required data for undo operation');
      return;
    }

    try {
      console.log('Rescheduling class...');
      const updatedSchedule = await scheduleApi.rescheduleClass(
        schedule.metadata.version,
        classItem.id,
        {
          dayOfWeek: classItem.originalDayOfWeek,
          period: classItem.originalPeriod
        }
      );

      console.log('Updating states...');
      setSchedule(updatedSchedule);
      setUnscheduledClasses(prev => {
        const newState = prev.filter(c => c.id !== classItem.id);
        console.log('New unscheduled classes:', newState);
        return newState;
      });
      console.log('Undo completed successfully');
    } catch (error) {
      console.error('Undo operation failed:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule class",
        variant: "destructive",
      });
    }
    console.log('=== Undo Operation Completed ===');
  };

  const handleClassMove = (classId: string, newDayOfWeek: number, newPeriod: number) => {
    if (!schedule) return;
    
    // We're using the drag-and-drop handling, so this can be a no-op
    console.log('Class move via callback:', { classId, newDayOfWeek, newPeriod });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Generator</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col items-start">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Select Start Date</h3>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  defaultMonth={new Date()}
                  className="border rounded-md p-3"
                  classNames={{
                    months: "flex flex-col",
                    month: "space-y-4",
                    caption: "flex justify-start pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center absolute right-1",
                    nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-80",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex justify-between",
                    head_cell: "w-10 font-medium text-sm text-muted-foreground",
                    row: "flex justify-between mt-2",
                    cell: "h-10 w-10 text-center relative p-0",
                    day: "h-10 w-10 p-0 hover:bg-accent hover:text-accent-foreground",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50 pointer-events-none"
                  }}
                  disabled={(date) => 
                    date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                    date.getDay() === 0 || 
                    date.getDay() === 6
                  }
                />
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-[350px] mx-auto">
                <Button
                  onClick={generateSchedule}
                  disabled={generating || !startDate}
                  className="w-full sm:flex-1"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Schedule'
                  )}
                </Button>
                {schedule && (
                  <Button
                    onClick={optimizeSchedule}
                    disabled={generating}
                    variant="outline"
                    className="w-full sm:flex-1"
                  >
                    Optimize Schedule
                  </Button>
                )}
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-500">
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {schedule && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <WeeklySchedule 
              classes={schedule.classes.filter(c => c.dayOfWeek !== 0)}
              onClassMove={handleClassMove}
            />
            <UnscheduledClasses
              classes={unscheduledClasses}
              onUndoUnschedule={handleUndoUnschedule}
            />
          </div>
        )}
      </div>
    </DragDropContext>
  );
} 