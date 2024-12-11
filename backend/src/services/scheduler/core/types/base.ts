// Grade level types
export type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple';

// Day and period types
export type DayOfWeek = 1 | 2 | 3 | 4 | 5; // Monday = 1, Friday = 5
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Constraint types
export interface Conflict {
  dayOfWeek: DayOfWeek;
  period: Period;
}

// Schedule types
export interface ScheduleEntry {
  classId: string;
  assignedDate: Date;
  period: Period;
}

// Blackout period types
export interface BlackoutPeriod {
  date: Date;
  periods?: Period[];
  allDay?: boolean;
} 