import { Period } from './base';
import { AdditionalConflict } from './class';

// Schedule constraints type
export interface ScheduleConstraints {
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  maxConsecutivePeriods: number;
  avoidConsecutivePeriods: boolean;
  blackoutPeriods: Array<{
    date: Date;
    period: Period;
  }>;
}

// Schedule entry type
export interface ScheduleEntry {
  classId: string;
  assignedDate: Date;
  period: Period;
}

// Scheduled class type
export interface ScheduledClass {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  period: number;
  originalDayOfWeek?: number;
  originalPeriod?: number;
  conflicts: Array<{ dayOfWeek: number; period: number }>;
  isInConflict?: boolean;
  room?: string;
}

// Schedule type
export interface Schedule {
  classes: ScheduledClass[]
  metadata: {
    generatedAt: Date
    version: string
    totalWeeks: number
  }
  quality: {
    totalScore: number
    metrics: {
      dayDistribution: number
      timeGaps: number
      periodUtilization: number
    }
  }
}

// Rotation type
export interface Rotation {
  id?: string;
  startDate: Date;
  status: 'draft' | 'active' | 'completed';
  schedule: ScheduleEntry[];
  additionalConflicts: AdditionalConflict[];
  quality?: {
    totalScore: number;
    metrics: {
      dayDistribution: number;
      timeGaps: number;
      periodUtilization: number;
    };
    details?: {
      classesPerDay: number[];
      averageGapLength: number;
      morningToAfternoonRatio: number;
    };
  };
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 