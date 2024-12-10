export interface Schedule {
    classes: ScheduledClass[];
    metadata?: ScheduleMetadata;
}

export interface ScheduledClass {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number;
    period: number;
    room?: string;
    conflicts?: Array<{ dayOfWeek: number; period: number }>;
    isInConflict?: boolean;
}

export interface ScheduleMetadata {
    generatedAt: Date;
    version: string;
    qualityScore?: number;
    totalWeeks?: number;
}

export interface ScheduleQuality {
    totalScore: number;
    metrics: {
        dayDistribution: number;
        timeGaps: number;
        periodUtilization: number;
        weekCount: number;
        weekDistribution: number;
    };
    details: {
        classesPerDay: number[];
        averageGapLength: number;
        morningToAfternoonRatio: number;
        weeksUsed: number;
        classesPerWeek: number[];
    };
}

export interface ScheduleParams {
    constraints: ScheduleConstraints;
    preferences: SchedulePreferences;
}

export interface ScheduleConstraints {
    maxPeriodsPerDay: number;
    maxPeriodsPerWeek: number;
    maxConsecutivePeriods: number;
    avoidConsecutivePeriods: boolean;
    blackoutPeriods: Array<{ date: Date; period: number }>;
}

export interface SchedulePreferences {
    preferredStartTime?: Date;
    preferredEndTime?: Date;
    preferredDays?: number[];
}

export interface OptimizationProgress {
    currentScore: ScheduleQuality;
    timeElapsed: number;
    currentWeeks: number;
    bestWeeks: number;
    message?: string;
}

export interface OptimizationResult {
    schedule: Schedule | null;
    score: ScheduleQuality;
    weeksUsed: number;
    timeElapsed: number;
    message?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    code: string;
    message: string;
    affectedClasses?: string[];
}

export interface ValidationWarning {
    code: string;
    message: string;
    affectedClasses?: string[];
}

export interface ISchedulerService {
    generateSchedule(params: ScheduleParams): Promise<Schedule>;
    evaluateScheduleQuality(schedule: Schedule): Promise<ScheduleQuality>;
    validateSchedule(schedule: Schedule): Promise<ValidationResult>;
}
