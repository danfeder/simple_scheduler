"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scheduleApi } from '@/app/api/scheduleApi';
import { toast } from '@/components/ui/use-toast';
import { WeeklySchedule } from "./WeeklySchedule";
import { UnscheduledClasses } from "./UnscheduledClasses";
import { Schedule, ScheduledClass } from "@/types/schedule";
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ScheduleGenerator() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule | null>(null);
  const [unscheduledClasses, setUnscheduledClasses] = useState<ScheduledClass[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [draggedClass, setDraggedClass] = useState<ScheduledClass | null>(null);

  const generateSchedule = async () => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const { scheduleId } = await scheduleApi.generate(startDate);
      
      // Start polling for status
      const checkStatus = async () => {
        const status = await scheduleApi.getStatus(scheduleId);
        
        if (status.state === 'completed') {
          const schedule = await scheduleApi.get(scheduleId);
          setGeneratedSchedule(schedule);
          console.log("Generated Schedule:", schedule);
          setUnscheduledClasses(schedule.classes.filter(c => c.dayOfWeek === 0));
          setCurrentWeekStart(getWeekStart(startDate));
          setGenerating(false);
          toast({
            title: "Success",
            description: "Schedule generated successfully",
          });
        } else if (status.state === 'failed') {
          setGenerating(false);
          toast({
            title: "Error",
            description: status.error || "Failed to generate schedule",
            variant: "destructive",
          });
        } else {
          // Continue polling if still in progress
          setTimeout(checkStatus, 2000);
        }
      };

      checkStatus();
    } catch (error) {
      setGenerating(false);
      toast({
        title: "Error",
        description: "Failed to start schedule generation",
        variant: "destructive",
      });
    }
  };

  const optimizeSchedule = async () => {
    if (!generatedSchedule) return;

    try {
      setGenerating(true);
      const optimizedSchedule = await scheduleApi.optimize(generatedSchedule.metadata.version);
      setGeneratedSchedule(optimizedSchedule);
      setUnscheduledClasses(optimizedSchedule.classes.filter(c => c.dayOfWeek === 0));
      toast({
        title: "Success",
        description: "Schedule optimized successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to optimize schedule",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    if (currentWeekStart) {
      const newWeekStart = new Date(currentWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeekStart(newWeekStart);
    }
  };

  const getWeekNumber = () => {
    if (currentWeekStart && startDate) {
      const diffTime = Math.abs(currentWeekStart.getTime() - getWeekStart(startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7) + 1;
    }
    return 1;
  };

  const hasScheduledClasses = () => {
    if (generatedSchedule && currentWeekStart) {
      const weekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return generatedSchedule.classes.some(c => 
        new Date(c.startTime) >= currentWeekStart && new Date(c.startTime) < weekEnd
      );
    }
    return false;
  };

  const onDragStart = (start: any) => {
    const draggedClass = generatedSchedule?.classes.find(c => c.id === start.draggableId) ||
                         unscheduledClasses.find(c => c.id === start.draggableId);
    setDraggedClass(draggedClass || null);
  };

  const onDragEnd = (result: DropResult) => {
    setDraggedClass(null);
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    // Implement the drag and drop logic here
    // This will involve updating the generatedSchedule and unscheduledClasses states
  };

  const unscheduleClass = (classToUnschedule: ScheduledClass) => {
    if (generatedSchedule) {
      setGeneratedSchedule(prev => {
        if (!prev) return null;
        return {
          ...prev,
          classes: prev.classes.filter(c => c.id !== classToUnschedule.id)
        };
      });
      setUnscheduledClasses(prev => [...prev, {
        ...classToUnschedule,
        dayOfWeek: 0,
        period: 0,
        startTime: new Date(0),
        endTime: new Date(0)
      }]);
    }
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
              />
            </div>
            <div className="space-x-4">
              <Button 
                onClick={generateSchedule} 
                disabled={generating || !startDate}
              >
                {generating ? 'Generating...' : 'Generate Schedule'}
              </Button>
              {generatedSchedule && (
                <Button 
                  onClick={optimizeSchedule}
                  disabled={generating}
                  variant="outline"
                >
                  Optimize Schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Weekly Schedule</CardTitle>
                {currentWeekStart && (
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => changeWeek('prev')} disabled={getWeekNumber() === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>Week {getWeekNumber()}</span>
                    <Button variant="outline" size="icon" onClick={() => changeWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedSchedule && currentWeekStart ? (
                <WeeklySchedule 
                  schedule={generatedSchedule}
                  weekStart={currentWeekStart}
                  startDate={startDate!}
                  onUnscheduleClass={unscheduleClass}
                  hasScheduledClasses={hasScheduledClasses()}
                  draggedClass={draggedClass}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Generate a schedule to view the weekly schedule here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Unscheduled Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {unscheduledClasses.length > 0 ? (
                <UnscheduledClasses classes={unscheduledClasses} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No unscheduled classes.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DragDropContext>
  );
}

