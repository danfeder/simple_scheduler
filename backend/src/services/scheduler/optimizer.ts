import { SchedulerService } from './index';
import { ScheduleQuality } from './types';
import { Class, ScheduleEntry, Period, Schedule } from 'shared/types';
import { evaluateDistribution, evaluateTimeGaps, evaluatePeriodUtilization } from './utils';

export class SchedulerOptimizer {
    private startDate: Date;

    constructor(private scheduler: SchedulerService, startDate: Date) {
        this.startDate = startDate;
    }

    async optimizeSchedule(schedule: ScheduleEntry[]): Promise<ScheduleQuality> {
        // Convert ScheduleEntry[] to Schedule format for evaluation
        const convertedSchedule: Schedule = {
            classes: schedule.map(entry => ({
                id: entry.classId,
                name: this.scheduler.getClasses().get(entry.classId)?.classNumber || '',
                startTime: entry.assignedDate,
                endTime: entry.assignedDate,
                dayOfWeek: ((new Date(entry.assignedDate).getDay() + 6) % 7) + 1,
                period: entry.period,
                conflicts: [],
                isInConflict: false
            })),
            metadata: {
                generatedAt: new Date(),
                version: 'v1',
                totalWeeks: 1
            },
            quality: {
                totalScore: 0,
                metrics: {
                    dayDistribution: 0,
                    timeGaps: 0,
                    periodUtilization: 0
                }
            }
        };

        return this.evaluateScheduleQuality(convertedSchedule);
    }

    private evaluateScheduleQuality(schedule: Schedule): ScheduleQuality {
        const dayDistribution = evaluateDistribution(schedule.classes);
        const timeGaps = evaluateTimeGaps(schedule.classes);
        const periodUtilization = evaluatePeriodUtilization(schedule.classes);

        // Calculate total score (weighted average)
        const totalScore = (dayDistribution * 0.4) + (timeGaps * 0.3) + (periodUtilization * 0.3);

        // Get detailed metrics
        const classesPerDay = Array(5).fill(0);
        schedule.classes.forEach(cls => {
            if (cls.dayOfWeek >= 1 && cls.dayOfWeek <= 5) {
                classesPerDay[cls.dayOfWeek - 1]++;
            }
        });

        // Calculate morning/afternoon ratio
        const morningClasses = schedule.classes.filter(cls => cls.startTime.getHours() < 12).length;
        const afternoonClasses = schedule.classes.length - morningClasses;
        const morningToAfternoonRatio = morningClasses / (afternoonClasses || 1);

        // Calculate average gap
        const gaps: number[] = [];
        const sortedByDay = [...schedule.classes].sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.getTime() - b.startTime.getTime();
        });

        for (let i = 1; i < sortedByDay.length; i++) {
            const current = sortedByDay[i];
            const previous = sortedByDay[i - 1];
            if (current.dayOfWeek === previous.dayOfWeek) {
                gaps.push(current.startTime.getTime() - previous.endTime.getTime());
            }
        }

        const averageGapLength = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length / (1000 * 60) : 0;

        return {
            totalScore,
            metrics: {
                dayDistribution,
                timeGaps,
                periodUtilization
            },
            details: {
                classesPerDay,
                averageGapLength,
                morningToAfternoonRatio
            }
        };
    }
} 