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

// Rotation type
export interface Rotation {
  id?: string;
  startDate: Date;
  status: 'draft' | 'active' | 'completed';
  schedule: ScheduleEntry[];
  additionalConflicts: AdditionalConflict[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 