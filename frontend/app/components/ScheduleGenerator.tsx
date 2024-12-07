"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scheduleApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';

interface ScheduledClass {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  period: number;
  room?: string;
}

interface Schedule {
  classes: ScheduledClass[];
  metadata: {
    generatedAt: Date;
    version: string;
    qualityScore?: number;
  };
  quality: {
    totalScore: number;
    metrics: {
      dayDistribution: number;
      timeGaps: number;
      periodUtilization: number;
    };
  };
}

export function ScheduleGenerator() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

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
      const interval = setInterval(async () => {
        try {
          const status = await scheduleApi.getStatus(scheduleId);
          
          if (status.state === 'completed') {
            const schedule = await scheduleApi.get(scheduleId);
            setGeneratedSchedule(schedule);
            clearInterval(interval);
            setGenerating(false);
            toast({
              title: "Success",
              description: "Schedule generated successfully",
            });
          } else if (status.state === 'failed') {
            clearInterval(interval);
            setGenerating(false);
            toast({
              title: "Error",
              description: status.error || "Failed to generate schedule",
              variant: "destructive",
            });
          }
          // Continue polling if still in progress
        } catch (error) {
          clearInterval(interval);
          setGenerating(false);
          toast({
            title: "Error",
            description: "Failed to check generation status",
            variant: "destructive",
          });
        }
      }, 2000); // Poll every 2 seconds

      setPollInterval(interval);
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

  return (
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

      {generatedSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Schedule</CardTitle>
            <div className="text-sm text-gray-500">
              Quality Score: {generatedSchedule.quality.totalScore.toFixed(2)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2">Period</th>
                    <th className="border p-2">Monday</th>
                    <th className="border p-2">Tuesday</th>
                    <th className="border p-2">Wednesday</th>
                    <th className="border p-2">Thursday</th>
                    <th className="border p-2">Friday</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }, (_, periodIndex) => (
                    <tr key={periodIndex}>
                      <td className="border p-2 font-bold">Period {periodIndex + 1}</td>
                      {Array.from({ length: 5 }, (_, dayIndex) => {
                        const classForSlot = generatedSchedule.classes.find(
                          c => c.dayOfWeek === dayIndex + 1 && c.period === periodIndex + 1
                        );
                        return (
                          <td key={dayIndex} className="border p-2">
                            {classForSlot ? (
                              <div>
                                <div className="font-medium">{classForSlot.name}</div>
                                {classForSlot.room && (
                                  <div className="text-sm text-gray-500">Room: {classForSlot.room}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400">Empty</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>Generated: {new Date(generatedSchedule.metadata.generatedAt).toLocaleString()}</div>
              <div>Version: {generatedSchedule.metadata.version}</div>
              <div className="mt-2">
                <strong>Quality Metrics:</strong>
                <ul className="list-disc list-inside">
                  <li>Day Distribution: {generatedSchedule.quality.metrics.dayDistribution.toFixed(2)}</li>
                  <li>Time Gaps: {generatedSchedule.quality.metrics.timeGaps.toFixed(2)}</li>
                  <li>Period Utilization: {generatedSchedule.quality.metrics.periodUtilization.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 