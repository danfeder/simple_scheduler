import { Period } from './base';
import { AdditionalConflict } from './class';

// Schedule quality metrics type
export interface ScheduleQuality {
    totalScore: number;
    metrics: {
        dayDistribution: number;
        timeGaps: number;
        periodUtilization: number;
        weekDistribution?: number;
        constraintSatisfaction?: number;
    };
    details?: {
        classesPerDay: number[];
        averageGapLength: number;
        morningToAfternoonRatio: number;
        weeksUsed?: number;
        classesPerWeek?: number[];
    };
}

// Schedule constraints type
export interface ScheduleConstraints {
    maxPeriodsPerDay: number;
    maxPeriodsPerWeek: number;
    maxConsecutivePeriods: number;
    avoidConsecutivePeriods: boolean;
    /**
     * Frontend format: Array of individual period blackouts
     * Storage format: Consolidated by date with optional allDay flag
     * Conversion handled by StorageService
     */
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
    quality: ScheduleQuality;
}

// Rotation type
export interface Rotation {
    id?: string;
    startDate: Date;
    status: 'draft' | 'active' | 'completed';
    schedule: ScheduleEntry[];
    additionalConflicts: AdditionalConflict[];
    quality?: ScheduleQuality;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
} 