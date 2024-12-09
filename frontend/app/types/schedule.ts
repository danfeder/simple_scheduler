import { DayOfWeek, Period } from './common';

export interface ScheduledClass {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: DayOfWeek;
  period: Period;
  room?: string;
}

export interface Schedule {
  classes: ScheduledClass[];
  metadata: ScheduleMetadata;
  quality: ScheduleQuality;
}

export interface ScheduleMetadata {
  generatedAt: Date;
  version: string;
  qualityScore?: number;
}

export interface ScheduleQuality {
  totalScore: number;
  metrics: {
    dayDistribution: number;
    timeGaps: number;
    periodUtilization: number;
  };
}

export interface DragDropContext {
  droppableId: string;
  index: number;
}

export interface DroppableScheduleDay {
  dayOfWeek: DayOfWeek;
  date: Date;
  classes: ScheduledClass[];
} 