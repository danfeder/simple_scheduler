import { TimeSlot } from './Graph';

export interface ClassScheduleBlock {
    dayOfWeek: number;  // 1-5 for Monday-Friday
    period: number;     // 1-8 for periods
}

export interface BlackoutPeriod {
    date: Date;         // Specific date (e.g., "2023-12-16")
    periods?: number[]; // Specific periods to block (e.g., [6,7,8] for last 3 periods)
    allDay?: boolean;   // If true, blocks entire day regardless of periods
}

export interface BasicScheduleConstraints {
    maxPeriodsPerDay: number;
    maxPeriodsPerWeek: number;
    maxConsecutivePeriods: number;
    avoidConsecutivePeriods: boolean;
    blackoutPeriods: BlackoutPeriod[];  // Date-specific blackout periods
}

export interface ScheduledClass {
    id: string;
    name: string;
    blockedPeriods: ClassScheduleBlock[];  // Pre-defined weekly schedule blocks
}

export interface ConstraintViolation {
    type: 'blocked_period' | 'consecutive_periods' | 'blackout_period' | 'max_periods';
    classIds: string[];
    message: string;
}

export interface ConstraintValidationResult {
    isValid: boolean;
    violations: ConstraintViolation[];
} 