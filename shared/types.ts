export interface ScheduleConstraints {
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  maxConsecutivePeriods: number;
  avoidConsecutivePeriods: boolean;
  blackoutPeriods: BlackoutPeriod[];
}

export interface BlackoutPeriod {
  date: string;
  period: number;
}

export interface Class {
  id: string;
  classNumber: string;
  grade: string;
  defaultConflicts: string[];
  active: boolean;
}

export interface Period {
  dayOfWeek: DayOfWeek;
  period: number;
}

export interface ScheduleEntry {
  classId: string;
  date: Date;
  period: number;
}

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

export type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple'; 