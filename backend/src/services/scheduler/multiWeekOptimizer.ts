import { SchedulerService } from './index';
import { 
    Schedule, 
    ScheduleQuality, 
    OptimizationProgress, 
    OptimizationResult
} from './types';
import { 
    Class, 
    ScheduleEntry, 
    Period, 
    ScheduleConstraints,
    ScheduledClass 
} from 'shared/types';
import { evaluateDistribution, evaluateTimeGaps, evaluatePeriodUtilization } from './utils';
import EventEmitter from 'events';

export class MultiWeekOptimizer extends EventEmitter {
    private startDate: Date;
    private maxTimeSeconds: number;
    private bestSchedule: Schedule | null = null;
    private bestScore: number = 0;
    private readonly DEFAULT_MAX_WEEKS = 6;

    constructor(
        private scheduler: SchedulerService, 
        startDate: Date,
        maxTimeSeconds: number = 30
    ) {
        super();
        this.startDate = startDate;
        this.maxTimeSeconds = maxTimeSeconds;
        console.log(`Initializing MultiWeekOptimizer with startDate=${startDate}, maxTimeSeconds=${maxTimeSeconds}`);
    }

    async optimizeMultiWeek(classes: Class[], constraints: ScheduleConstraints): Promise<OptimizationResult> {
        console.group('Multi-Week Optimization');
        const totalStartTime = performance.now();
        
        try {
            console.log(`Starting optimization for ${classes.length} classes with constraints:`, constraints);
            
            // Calculate minimum possible weeks based on constraints
            console.group('Week Calculation');
            const weekCalcStart = performance.now();
            
            const classesPerWeek = constraints.maxPeriodsPerWeek;
            const minWeeks = Math.ceil(classes.length / (classesPerWeek * 5)); // 5 days per week
            let currentWeeks = Math.min(this.DEFAULT_MAX_WEEKS, minWeeks * 2); // Start with double min weeks or max

            console.log(`Calculated minWeeks=${minWeeks}, starting with currentWeeks=${currentWeeks}`);
            console.log(`Week calculation took ${(performance.now() - weekCalcStart).toFixed(2)}ms`);
            console.groupEnd();

            while (currentWeeks >= minWeeks && 
                   (performance.now() - totalStartTime) < this.maxTimeSeconds * 1000) {
                
                console.group(`\nWeek Iteration: ${currentWeeks} weeks`);
                const iterationStart = performance.now();
                
                // Try to generate schedule with current week count
                console.group('Schedule Generation');
                const genStart = performance.now();
                const scheduleAttempt = await this.generateScheduleForWeeks(
                    classes,
                    currentWeeks,
                    constraints
                );
                console.log(`Generation took ${(performance.now() - genStart).toFixed(2)}ms`);
                console.groupEnd();

                if (scheduleAttempt) {
                    console.group('Schedule Evaluation');
                    const evalStart = performance.now();
                    
                    const score = this.evaluateMultiWeekSchedule(scheduleAttempt, currentWeeks);
                    console.log('Evaluation results:', {
                        totalScore: score.totalScore,
                        metrics: score.metrics,
                        details: score.details
                    });
                    
                    if (score.totalScore > this.bestScore) {
                        console.log(`New best score: ${score.totalScore} (previous: ${this.bestScore})`);
                        this.bestScore = score.totalScore;
                        this.bestSchedule = scheduleAttempt;
                        
                        this.emit('progress', {
                            currentScore: score,
                            timeElapsed: performance.now() - totalStartTime,
                            currentWeeks,
                            bestWeeks: currentWeeks,
                            message: `Found improved schedule with ${currentWeeks} weeks`
                        } as OptimizationProgress);
                    }

                    console.log(`Evaluation took ${(performance.now() - evalStart).toFixed(2)}ms`);
                    console.groupEnd();

                    // Decide next iteration
                    if (score.metrics.weekCount > 0.8) {
                        console.log(`Good efficiency (${score.metrics.weekCount}), reducing weeks`);
                        currentWeeks--;
                    } else {
                        console.log(`Low efficiency (${score.metrics.weekCount}), keeping current weeks`);
                    }
                } else {
                    console.log('Failed to generate schedule');
                    break;
                }

                console.log(`Iteration took ${(performance.now() - iterationStart).toFixed(2)}ms`);
                console.groupEnd(); // Week Iteration
            }

            const totalTime = performance.now() - totalStartTime;
            console.log(`\nOptimization complete in ${totalTime.toFixed(2)}ms`);

            if (!this.bestSchedule) {
                console.log('No valid schedule found');
                return {
                    schedule: null,
                    score: this.getEmptyScore(),
                    weeksUsed: 0,
                    timeElapsed: totalTime,
                    message: "Could not find a valid schedule"
                };
            }

            const finalScore = this.evaluateMultiWeekSchedule(
                this.bestSchedule, 
                this.calculateWeeksUsed(this.bestSchedule)
            );

            console.log('Final result:', {
                weeksUsed: this.calculateWeeksUsed(this.bestSchedule),
                score: finalScore,
                timeElapsed: totalTime
            });

            return {
                schedule: this.bestSchedule,
                score: finalScore,
                weeksUsed: this.calculateWeeksUsed(this.bestSchedule),
                timeElapsed: totalTime,
                message: "Successfully optimized schedule"
            };
        } finally {
            console.groupEnd(); // Multi-Week Optimization
        }
    }

    private async generateScheduleForWeeks(
        classes: Class[],
        weekCount: number,
        constraints: ScheduleConstraints
    ): Promise<Schedule | null> {
        try {
            // Convert our constraints to match the shared interface
            const sharedConstraints = {
                maxPeriodsPerDay: constraints.maxPeriodsPerDay,
                maxPeriodsPerWeek: constraints.maxPeriodsPerWeek,
                maxConsecutivePeriods: constraints.maxConsecutivePeriods,
                avoidConsecutivePeriods: constraints.avoidConsecutivePeriods,
                blackoutPeriods: constraints.blackoutPeriods
            } as const;

            // Update scheduler with shared constraints
            this.scheduler = new SchedulerService(sharedConstraints);
            await this.scheduler.initialize(classes);
            
            // Generate schedule starting from our start date
            const rawSchedule = await this.scheduler.generateSchedule(this.startDate);
            
            // Convert to Schedule format
            return {
                classes: rawSchedule.map((entry: ScheduleEntry): ScheduledClass => ({
                    id: entry.classId,
                    name: this.scheduler.getClasses().get(entry.classId)?.classNumber || '',
                    startTime: new Date(entry.assignedDate),
                    endTime: new Date(entry.assignedDate),
                    dayOfWeek: ((new Date(entry.assignedDate).getDay() + 6) % 7) + 1,
                    period: entry.period as number,
                    conflicts: [], // Initialize with empty array since it's required
                    isInConflict: false
                })),
                metadata: {
                    generatedAt: new Date(),
                    version: 'v1',
                }
            };
        } catch (error) {
            console.error('Failed to generate schedule:', error);
            return null;
        }
    }

    private evaluateMultiWeekSchedule(schedule: Schedule, weekCount: number): ScheduleQuality {
        const dayDistribution = evaluateDistribution(schedule.classes);
        const timeGaps = evaluateTimeGaps(schedule.classes);
        const periodUtilization = evaluatePeriodUtilization(schedule.classes);
        const weekDistribution = this.evaluateWeekDistribution(schedule, weekCount);
        const weekCountScore = this.evaluateWeekCount(schedule, weekCount);

        // Calculate total score with weights
        const totalScore = (
            dayDistribution * 0.2 + 
            timeGaps * 0.2 + 
            periodUtilization * 0.2 + 
            weekDistribution * 0.2 + 
            weekCountScore * 0.2
        );

        // Get classes per day and week
        const classesPerDay = Array(5).fill(0);
        const classesPerWeek = Array(weekCount).fill(0);

        schedule.classes.forEach(cls => {
            const date = new Date(cls.startTime);
            const dayOfWeek = ((date.getDay() + 6) % 7); // 0-4 for Mon-Fri
            const weekIndex = this.getWeekIndex(date);
            
            if (dayOfWeek >= 0 && dayOfWeek < 5) {
                classesPerDay[dayOfWeek]++;
            }
            if (weekIndex >= 0 && weekIndex < weekCount) {
                classesPerWeek[weekIndex]++;
            }
        });

        return {
            totalScore,
            metrics: {
                dayDistribution,
                timeGaps,
                periodUtilization,
                weekCount: weekCountScore,
                weekDistribution
            },
            details: {
                classesPerDay,
                averageGapLength: this.calculateAverageGap(schedule.classes as ScheduledClass[]),
                morningToAfternoonRatio: this.calculateMorningAfternoonRatio(schedule.classes as ScheduledClass[]),
                weeksUsed: this.calculateWeeksUsed(schedule),
                classesPerWeek
            }
        };
    }

    private getWeekIndex(date: Date): number {
        const startWeek = this.getWeekNumber(this.startDate);
        const currentWeek = this.getWeekNumber(date);
        return currentWeek - startWeek;
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    private calculateWeeksUsed(schedule: Schedule): number {
        if (!schedule.classes.length) return 0;
        
        const dates = schedule.classes.map(c => new Date(c.startTime));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        return Math.ceil((maxDate.getTime() - minDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    private evaluateWeekDistribution(schedule: Schedule, targetWeeks: number): number {
        const classesPerWeek = Array(targetWeeks).fill(0);
        schedule.classes.forEach(cls => {
            const weekIndex = this.getWeekIndex(new Date(cls.startTime));
            if (weekIndex >= 0 && weekIndex < targetWeeks) {
                classesPerWeek[weekIndex]++;
            }
        });

        const idealClassesPerWeek = Math.ceil(schedule.classes.length / targetWeeks);
        const variance = classesPerWeek.reduce((acc, count) => {
            const diff = count - idealClassesPerWeek;
            return acc + (diff * diff);
        }, 0) / targetWeeks;

        return Math.max(0, 1 - (variance / (idealClassesPerWeek * idealClassesPerWeek)));
    }

    private evaluateWeekCount(schedule: Schedule, targetWeeks: number): number {
        const weeksUsed = this.calculateWeeksUsed(schedule);
        return Math.max(0, 1 - (Math.abs(weeksUsed - targetWeeks) / targetWeeks));
    }

    private calculateAverageGap(classes: ScheduledClass[]): number {
        if (classes.length < 2) return 0;

        const gaps: number[] = [];
        const sortedByDay = [...classes].sort((a, b) => {
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

        return gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length / (1000 * 60) : 0;
    }

    private calculateMorningAfternoonRatio(classes: ScheduledClass[]): number {
        const morningClasses = classes.filter(c => c.startTime.getHours() < 12).length;
        const afternoonClasses = classes.length - morningClasses;
        return morningClasses / (afternoonClasses || 1);
    }

    private getEmptyScore(): ScheduleQuality {
        return {
            totalScore: 0,
            metrics: {
                dayDistribution: 0,
                timeGaps: 0,
                periodUtilization: 0,
                weekCount: 0,
                weekDistribution: 0
            },
            details: {
                classesPerDay: Array(5).fill(0),
                averageGapLength: 0,
                morningToAfternoonRatio: 0,
                weeksUsed: 0,
                classesPerWeek: []
            }
        };
    }
} 