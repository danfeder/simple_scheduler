// Grade level types
export type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple';

// Day and period types
export type DayOfWeek = 1 | 2 | 3 | 4 | 5;
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Conflict type
export interface Conflict {
  dayOfWeek: DayOfWeek;
  period: Period;
}

// Additional conflict type
export interface AdditionalConflict extends Conflict {
  classId: string;
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

// Blackout period type
export interface BlackoutPeriod {
  date: Date;
  period: Period;
}

// Schedule constraints type
export interface ScheduleConstraints {
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  blackoutPeriods: BlackoutPeriod[];
  avoidConsecutivePeriods: boolean;
  maxConsecutivePeriods: number;
}

// Helper function to check class availability
export function isClassAvailable(classDoc: Class, date: Date, period: Period): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend

  const schoolDayOfWeek = dayOfWeek as DayOfWeek;
  return !classDoc.defaultConflicts.some(
    (conflict: Conflict) =>
      conflict.dayOfWeek === schoolDayOfWeek && conflict.period === period
  );
}

export interface SchedulerConfig {
    dayDistributionWeight: number;
    spacingWeight: number;
}

export interface ScheduleQualityMetrics {
    // Distribution Metrics
    averageClassesPerDay: number;
    standardDeviationClassesPerDay: number;
    dayUtilization: number;

    // Spacing Metrics
    averageGapBetweenClasses: number;
    minimumGapBetweenClasses: number;
    consecutiveClassCount: number;

    // Time Slot Usage
    morningPeriodUtilization: number;
    middayPeriodUtilization: number;
    afternoonPeriodUtilization: number;
    
    // Overall Metrics
    totalScore: number;
    constraintSatisfactionRate: number;
}

export interface OptimizationResult {
    metrics: ScheduleQualityMetrics;
    schedule: ScheduleEntry[];
    config: SchedulerConfig;
    iterationCount: number;
    improvementCount: number;
    runtime: number;
} 