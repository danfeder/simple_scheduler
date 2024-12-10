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

// Create simple Progress and Badge components if not available
const Progress = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${value}%` }} />
  </div>
);

const Badge = ({ children, variant }: { children: React.ReactNode; variant: 'success' | 'warning' }) => (
  <span className={`px-2 py-1 rounded-full text-sm ${
    variant === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }`}>
    {children}
  </span>
);

interface RotationEntry {
  classId: string;
  assignedDate: string;
  period: number;
}

interface OptimizationMetrics {
  totalScore: number;
  dayDistribution: number;
  timeGaps: number;
  periodUtilization: number;
  weekCount: number;
  weekDistribution: number;
}

export function ScheduleGenerator() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule | null>(null);
  const [unscheduledClasses, setUnscheduledClasses] = useState<ScheduledClass[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [draggedClass, setDraggedClass] = useState<ScheduledClass | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationMetrics, setOptimizationMetrics] = useState<OptimizationMetrics | null>(null);

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
      console.log('Generating schedule for date:', startDate);
      const rotation = await scheduleApi.generate(startDate);
      
      // Transform rotation into schedule format
      const schedule: Schedule = {
        classes: rotation.schedule.map((entry: RotationEntry) => ({
          id: entry.classId,
          name: `Class ${entry.classId}`,
          startTime: new Date(entry.assignedDate),
          endTime: new Date(entry.assignedDate),
          dayOfWeek: new Date(entry.assignedDate).getDay(),
          period: entry.period
        })),
        metadata: {
          generatedAt: new Date(),
          version: rotation.id,
          qualityScore: 0,
          totalWeeks: calculateTotalWeeks(rotation.schedule)
        }
      };
      
      setGeneratedSchedule(schedule);
      setUnscheduledClasses(schedule.classes.filter((c: ScheduledClass) => c.dayOfWeek === 0));
      setCurrentWeekStart(getWeekStart(startDate));
      
      toast({
        title: "Success",
        description: "Schedule generated successfully",
      });
    } catch (error) {
      console.error('Schedule generation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate schedule",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const optimizeSchedule = async () => {
    if (!generatedSchedule) return;

    try {
      setOptimizing(true);
      const result = await scheduleApi.optimize(generatedSchedule.metadata.version);
      
      setGeneratedSchedule({
        ...result.rotation,
        metadata: {
          generatedAt: new Date(),
          version: result.rotation.id,
          qualityScore: result.optimizationResult.score.totalScore
        }
      });
      
      setOptimizationMetrics({
        totalScore: result.optimizationResult.score.totalScore,
        ...result.optimizationResult.score.metrics
      });

      toast({
        title: "Success",
        description: `Schedule optimized successfully (Score: ${(result.optimizationResult.score.totalScore * 100).toFixed(1)}%)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to optimize schedule",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
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

  const calculateTotalWeeks = (schedule: RotationEntry[]): number => {
    if (schedule.length === 0) return 0;
    
    const dates = schedule.map(entry => new Date(entry.assignedDate));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  const renderOptimizationMetrics = () => {
    if (!optimizationMetrics) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Optimization Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Overall Quality</span>
                <Badge variant={optimizationMetrics.totalScore > 0.8 ? "success" : "warning"}>
                  {(optimizationMetrics.totalScore * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={optimizationMetrics.totalScore * 100} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Day Distribution</span>
                <Progress value={optimizationMetrics.dayDistribution * 100} className="h-2" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Time Gaps</span>
                <Progress value={optimizationMetrics.timeGaps * 100} className="h-2" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Period Utilization</span>
                <Progress value={optimizationMetrics.periodUtilization * 100} className="h-2" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Week Distribution</span>
                <Progress value={optimizationMetrics.weekDistribution * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                  disabled={optimizing}
                  variant="outline"
                >
                  {optimizing ? 'Optimizing...' : 'Optimize Schedule'}
                </Button>
              )}
            </div>
            {optimizationMetrics && renderOptimizationMetrics()}
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

