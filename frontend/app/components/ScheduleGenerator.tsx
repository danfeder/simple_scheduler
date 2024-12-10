"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { scheduleApi, classesApi, constraintsApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';
import { Schedule, ScheduledClass } from '../../../shared/types/schedule';
import WeeklySchedule from './WeeklySchedule';
import UnscheduledClasses from './UnscheduledClasses';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Define types for the rotation response
interface ScheduleEntry {
  classId: string;
  assignedDate: string;
  period: number;
}

interface Rotation {
  id: string;
  startDate: string;
  status: 'draft' | 'active' | 'completed';
  schedule: ScheduleEntry[];
  additionalConflicts: any[];
  createdAt: string;
  updatedAt: string;
}

interface ClassDetails {
  id: string;
  classNumber: string;
  name?: string;
  room?: string;
  grade: string;
  defaultConflicts: any[];
  active: boolean;
}

export function ScheduleGenerator() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [generating, setGenerating] = useState(false);
  const [unscheduledClasses, setUnscheduledClasses] = useState<ScheduledClass[]>([]);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule && schedule.classes) {
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
      console.log('Generating schedule for date:', startDate);
      
      // Fetch saved constraints
      const constraints = await constraintsApi.get();
      console.log('Using constraints:', constraints);
      
      const rotation = await scheduleApi.generate(startDate, constraints);
      console.log('Received rotation:', rotation);
      
      if (!rotation || !rotation.schedule) {
        throw new Error('Invalid response from server');
      }

      // Fetch all classes to get their details
      console.log('Fetching class details...');
      const allClasses = await classesApi.getAll() as ClassDetails[];
      console.log('Received classes:', allClasses);
      
      // Transform schedule entries into ScheduledClass objects
      console.log('Transforming schedule entries...');
      const scheduledClasses = rotation.schedule.map((entry: ScheduleEntry) => {
        const classDetails = allClasses.find((c: ClassDetails) => c.id === entry.classId);
        if (!classDetails) {
          console.warn(`Class details not found for ID: ${entry.classId}`);
          return null;
        }
        console.log('Found class details:', classDetails);

        const scheduledClass: ScheduledClass = {
          id: classDetails.id,
          name: classDetails.classNumber,
          startTime: entry.assignedDate,
          endTime: entry.assignedDate,
          dayOfWeek: ((new Date(entry.assignedDate).getDay() + 6) % 7) + 1,
          period: entry.period,
          conflicts: [],
          isInConflict: false
        };
        console.log('Created scheduled class:', scheduledClass);
        return scheduledClass;
      }).filter(Boolean) as ScheduledClass[];

      console.log('Final scheduled classes:', scheduledClasses);

      // Create Schedule object
      const schedule: Schedule = {
        classes: scheduledClasses,
        metadata: {
          generatedAt: rotation.createdAt || new Date(),
          version: rotation.id || 'draft',
          totalWeeks: 1
        },
        quality: {
          totalScore: 0,
          metrics: {
            dayDistribution: 0,
            timeGaps: 0,
            periodUtilization: 0
          }
        }
      };
      console.log('Setting new schedule:', schedule);
      setSchedule(schedule);

      setGenerating(false);
      toast({
        title: 'Success',
        description: 'Schedule generated successfully',
      });

    } catch (error) {
      console.error('Schedule generation error:', error);
      setGenerating(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start schedule generation',
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
    if (!result.destination || !schedule) return;

    const { source, destination, draggableId } = result;

    try {
      // Moving between schedule slots
      if (source.droppableId !== 'unscheduled' && destination.droppableId !== 'unscheduled') {
        const [destDay, destPeriod] = destination.droppableId.split('-').map(Number);
        const conflicts = await scheduleApi.checkConflicts(
          schedule.metadata.version,
          draggableId,
          destDay,
          destPeriod
        );

        if (conflicts.hasConflicts) {
          toast({
            title: "Scheduling Conflict",
            description: "This time slot conflicts with existing classes",
            variant: "destructive",
          });
          return;
        }

        const updatedSchedule = await scheduleApi.updateClass(
          schedule.metadata.version,
          draggableId,
          { dayOfWeek: destDay, period: destPeriod }
        );
        setSchedule(updatedSchedule);
      }
      // Handle other drag scenarios...
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update class schedule",
        variant: "destructive",
      });
    }
  };

  const handleUndoUnschedule = async (classItem: ScheduledClass) => {
    if (!schedule || !classItem.originalDayOfWeek || !classItem.originalPeriod) {
      return;
    }

    try {
      const updatedSchedule = await scheduleApi.rescheduleClass(
        schedule.metadata.version,
        classItem.id,
        {
          dayOfWeek: classItem.originalDayOfWeek,
          period: classItem.originalPeriod
        }
      );

      setSchedule(updatedSchedule);
      setUnscheduledClasses(prev => prev.filter(c => c.id !== classItem.id));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule class",
        variant: "destructive",
      });
    }
  };

  const handleClassMove = (classId: string, newDayOfWeek: number, newPeriod: number) => {
    // This is handled by drag and drop, but we keep it for compatibility
    console.log('Class move requested:', { classId, newDayOfWeek, newPeriod });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Select Start Date</h3>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                className="rounded-md border"
                disabled={(date) => 
                  date < new Date() || 
                  date.getDay() === 0 || 
                  date.getDay() === 6
                }
              />
            </div>
            <div className="space-x-4">
              <Button 
                onClick={generateSchedule} 
                disabled={generating}
                className={cn(generating && "opacity-50 cursor-not-allowed")}
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
                  className={cn(generating && "opacity-50 cursor-not-allowed")}
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    'Optimize Schedule'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {schedule && (
          <>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Weekly Schedule</CardTitle>
                  {schedule.quality?.totalScore !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Quality Score: {schedule.quality.totalScore.toFixed(2)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {schedule && schedule.classes ? (
                  <WeeklySchedule 
                    classes={schedule.classes.filter(c => c.dayOfWeek !== 0)}
                    onClassMove={handleClassMove}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No classes scheduled yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unscheduled Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <UnscheduledClasses 
                  classes={unscheduledClasses}
                  onUndoUnschedule={handleUndoUnschedule}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DragDropContext>
  );
} 