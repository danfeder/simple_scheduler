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
    room?: string;
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
    details: {
        classesPerDay: number[];
        averageGapLength: number;
        morningToAfternoonRatio: number;
    };
}

export interface ScheduleParams {
    constraints: ScheduleConstraints;
    preferences: SchedulePreferences;
}

export interface ScheduleConstraints {
    maxClassesPerDay: number;
    minGapBetweenClasses: number;
    maxGapBetweenClasses: number;
    maxPeriodsPerDay?: number;
    maxPeriodsPerWeek?: number;
    blackoutPeriods?: any[];
    avoidConsecutivePeriods?: boolean;
    maxConsecutivePeriods?: number;
}

export interface SchedulePreferences {
    preferredStartTime?: Date;
    preferredEndTime?: Date;
    preferredDays?: number[];
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
