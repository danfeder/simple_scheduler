// Grade Types
export type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple';
export type DayOfWeek = 1 | 2 | 3 | 4 | 5; // Monday = 1, Friday = 5
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Class Types
export interface Conflict {
  dayOfWeek: DayOfWeek;
  period: Period;
}

export interface Class {
  id?: string;
  classNumber: string;
  grade: GradeLevel;
  defaultConflicts: Conflict[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper functions for availability checking
export const isClassAvailable = (classDoc: Class, date: Date, period: Period): boolean => {
  const dayOfWeek = (date.getDay() || 7) as DayOfWeek; // Convert Sunday (0) to 7
  
  // Check if this period conflicts with any default conflicts
  return !classDoc.defaultConflicts.some(
    conflict => conflict.dayOfWeek === dayOfWeek && conflict.period === period
  );
};

// Schedule Types
export interface ScheduleEntry {
  classId: string;
  assignedDate: Date;
  period: Period;
}

export interface AdditionalConflict extends Conflict {
  classId: string;
}

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

// Constraint Types
export interface ScheduleConstraints {
  maxPeriodsPerWeek: number;
  maxPeriodsPerDay: number;
  maxConsecutivePeriods: number;
  avoidConsecutivePeriods: boolean;
  blackoutPeriods: {
    date: Date;
    period: Period;
  }[];
} 