import { DayOfWeek, GradeLevel, Period } from './base';

// Conflict type
export interface Conflict {
  dayOfWeek: DayOfWeek;
  period: Period;
}

// Class type
export interface Class {
  id?: string;
  classNumber: string;
  grade: GradeLevel;
  defaultConflicts: Conflict[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AdditionalConflict extends Conflict {
  classId: string;
}

// Helper function to check class availability
export const isClassAvailable = (classDoc: Class, date: Date, period: Period): boolean => {
  const dayOfWeek = (date.getDay() || 7) as DayOfWeek; // Convert Sunday (0) to 7
  return !classDoc.defaultConflicts.some(
    conflict => conflict.dayOfWeek === dayOfWeek && conflict.period === period
  );
}; 