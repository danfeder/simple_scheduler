import { 
  Class, 
  Period, 
  ScheduleEntry, 
  ScheduleConstraints,
  SchedulerConfig,
  ScheduleQualityMetrics,
  OptimizationResult,
  isClassAvailable
} from '../../../shared/types';

interface ScheduleSlot {
  date: Date;
  period: Period;
  score?: number;
}

interface BacktrackingState {
  classIndex: number;
  schedule: ScheduleEntry[];
  scheduledPeriodsToday: Map<string, number>;
  scheduledPeriodsThisWeek: Map<string, number>;
}

export interface ISchedulerService {
  getSchedule(): ScheduleEntry[];
  initialize(classes: Class[]): Promise<void>;
  sortClassesByConstraints(classes: Class[]): Class[];
  scheduleWithBacktracking(sortedClasses: Class[], currentDate: Date, maxBacktracks?: number): Promise<boolean>;
  evaluateScheduleQuality(): ScheduleQualityMetrics;
  runOptimizationExperiment(classes: Class[], configs: SchedulerConfig[], iterationsPerConfig: number): Promise<OptimizationResult[]>;
}

export class SchedulerService implements ISchedulerService {
  private constraints: ScheduleConstraints;
  private startDate: Date;
  private schedule: ScheduleEntry[] = [];
  private classes: Class[] = [];
  private config: SchedulerConfig = {
    dayDistributionWeight: 0.5,
    spacingWeight: 0.5
  };

  constructor(startDate: Date, constraints: ScheduleConstraints) {
    this.startDate = startDate;
    this.constraints = constraints;
  }

  public getSchedule(): ScheduleEntry[] {
    return [...this.schedule];
  }

  public async initialize(classes: Class[]): Promise<void> {
    this.classes = classes.filter(c => c.active);
    this.schedule = [];
  }

  public sortClassesByConstraints(classes: Class[]): Class[] {
    return [...classes].sort((a, b) => 
      b.defaultConflicts.length - a.defaultConflicts.length
    );
  }

  private saveBacktrackingState(
    classIndex: number,
    schedule: ScheduleEntry[],
    scheduledPeriodsToday: Map<string, number>,
    scheduledPeriodsThisWeek: Map<string, number>
  ): BacktrackingState {
    return {
      classIndex,
      schedule: [...schedule],
      scheduledPeriodsToday: new Map(scheduledPeriodsToday),
      scheduledPeriodsThisWeek: new Map(scheduledPeriodsThisWeek)
    };
  }

  private restoreBacktrackingState(state: BacktrackingState): void {
    this.schedule = [...state.schedule];
  }

  public async scheduleWithBacktracking(
    sortedClasses: Class[],
    currentDate: Date,
    maxBacktracks: number = 10
  ): Promise<boolean> {
    const backtrackingStack: BacktrackingState[] = [];
    let currentClassIndex = 0;
    let backtracks = 0;
    
    const scheduledPeriodsToday = new Map<string, number>();
    const scheduledPeriodsThisWeek = new Map<string, number>();

    while (currentClassIndex < sortedClasses.length) {
      const classDoc = sortedClasses[currentClassIndex];
      const availableSlots = await this.findAvailableSlot(
        classDoc,
        currentDate,
        scheduledPeriodsToday,
        scheduledPeriodsThisWeek
      );

      if (availableSlots.length > 0) {
        const slot = availableSlots[0];
        
        backtrackingStack.push(this.saveBacktrackingState(
          currentClassIndex,
          this.schedule,
          scheduledPeriodsToday,
          scheduledPeriodsThisWeek
        ));

        const classId = classDoc.id!;
        scheduledPeriodsToday.set(classId, (scheduledPeriodsToday.get(classId) || 0) + 1);
        scheduledPeriodsThisWeek.set(classId, (scheduledPeriodsThisWeek.get(classId) || 0) + 1);

        this.schedule.push({
          classId,
          assignedDate: slot.date,
          period: slot.period,
        });

        currentClassIndex++;
      } else if (backtrackingStack.length > 0 && backtracks < maxBacktracks) {
        const previousState = backtrackingStack.pop()!;
        this.restoreBacktrackingState(previousState);
        currentClassIndex = previousState.classIndex;
        backtracks++;
      } else {
        return false;
      }
    }

    return true;
  }

  private meetsConstraints(
    classDoc: Class,
    date: Date,
    period: Period,
    scheduledPeriodsToday: Map<string, number>,
    scheduledPeriodsThisWeek: Map<string, number>
  ): boolean {
    const classId = classDoc.id!;
    const periodsToday = scheduledPeriodsToday.get(classId) || 0;
    const periodsThisWeek = scheduledPeriodsThisWeek.get(classId) || 0;

    if (periodsToday >= this.constraints.maxPeriodsPerDay) return false;
    if (periodsThisWeek >= this.constraints.maxPeriodsPerWeek) return false;

    if (this.constraints.avoidConsecutivePeriods) {
      const hasAdjacentPeriod = this.schedule.some(entry => {
        if (entry.assignedDate.getTime() !== date.getTime()) return false;
        return Math.abs(entry.period - period) === 1;
      });
      if (hasAdjacentPeriod) return false;
    }

    const isBlackout = this.constraints.blackoutPeriods.some(
      blackout =>
        blackout.date.getTime() === date.getTime() &&
        blackout.period === period
    );
    if (isBlackout) return false;

    if (!isClassAvailable(classDoc, date, period)) return false;

    const isPeriodBooked = this.schedule.some(entry =>
      entry.assignedDate.getTime() === date.getTime() &&
      entry.period === period
    );
    if (isPeriodBooked) return false;

    return true;
  }

  private getNextWeekday(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    return nextDay;
  }

  private calculateSlotScore(date: Date, period: Period, classId: string): number {
    let score = 1.0;

    const classesPerDay = new Map<string, number>();
    this.schedule.forEach(entry => {
      const dayKey = entry.assignedDate.toISOString().split('T')[0];
      classesPerDay.set(dayKey, (classesPerDay.get(dayKey) || 0) + 1);
    });
    
    const dayKey = date.toISOString().split('T')[0];
    const dayCount = classesPerDay.get(dayKey) || 0;
    const dayDistributionScore = 1 / (dayCount + 1);
    
    let spacingScore = 1.0;
    const daySchedule = this.schedule.filter(entry => 
      entry.assignedDate.toISOString().split('T')[0] === dayKey
    );
    
    for (const entry of daySchedule) {
      const gap = Math.abs(entry.period - period);
      if (gap < 2) {
        spacingScore *= 0.5;
      }
    }

    score = (
      this.config.dayDistributionWeight * dayDistributionScore +
      this.config.spacingWeight * spacingScore
    );

    return Math.max(0, score);
  }

  private async findAvailableSlot(
    classDoc: Class,
    currentDate: Date,
    scheduledPeriodsToday: Map<string, number>,
    scheduledPeriodsThisWeek: Map<string, number>
  ): Promise<ScheduleSlot[]> {
    let date = new Date(currentDate);
    const slots: ScheduleSlot[] = [];
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      if (date.getDay() === 1) {
        scheduledPeriodsThisWeek.clear();
      }

      for (let period = 1; period <= 8; period++) {
        if (this.meetsConstraints(
          classDoc,
          date,
          period as Period,
          scheduledPeriodsToday,
          scheduledPeriodsThisWeek
        )) {
          const score = this.calculateSlotScore(date, period as Period, classDoc.id!);
          slots.push({ date: new Date(date), period: period as Period, score });
        }
      }

      if (slots.length > 0) {
        slots.sort((a, b) => (b.score || 0) - (a.score || 0));
        return slots;
      }

      date = this.getNextWeekday(date);
      attempts++;
      
      if (date.getDay() === 1) {
        scheduledPeriodsThisWeek.clear();
      }
    }

    return slots;
  }

  public evaluateScheduleQuality(): ScheduleQualityMetrics {
    const metrics: ScheduleQualityMetrics = {
      averageClassesPerDay: 0,
      standardDeviationClassesPerDay: 0,
      dayUtilization: 0,
      averageGapBetweenClasses: 0,
      minimumGapBetweenClasses: Infinity,
      consecutiveClassCount: 0,
      morningPeriodUtilization: 0,
      middayPeriodUtilization: 0,
      afternoonPeriodUtilization: 0,
      totalScore: 0,
      constraintSatisfactionRate: 1.0
    };

    const scheduleByDay = new Map<string, ScheduleEntry[]>();
    this.schedule.forEach(entry => {
      const dayKey = entry.assignedDate.toISOString().split('T')[0];
      if (!scheduleByDay.has(dayKey)) {
        scheduleByDay.set(dayKey, []);
      }
      scheduleByDay.get(dayKey)!.push(entry);
    });

    const classesPerDay = Array.from(scheduleByDay.values()).map(entries => entries.length);
    metrics.averageClassesPerDay = classesPerDay.reduce((sum, count) => sum + count, 0) / classesPerDay.length;
    
    const variance = classesPerDay.reduce((sum, count) => 
      sum + Math.pow(count - metrics.averageClassesPerDay, 2), 0) / classesPerDay.length;
    metrics.standardDeviationClassesPerDay = Math.sqrt(variance);

    const totalSchoolDays = Array.from(scheduleByDay.keys()).length;
    const expectedSchoolDays = Math.ceil(this.schedule.length / this.constraints.maxPeriodsPerDay);
    metrics.dayUtilization = totalSchoolDays / expectedSchoolDays;

    let morningPeriods = 0;
    let middayPeriods = 0;
    let afternoonPeriods = 0;
    let totalGaps = 0;
    let gapCount = 0;

    scheduleByDay.forEach(entries => {
      entries.sort((a, b) => a.period - b.period);
      
      for (let i = 0; i < entries.length; i++) {
        const period = entries[i].period;
        if (period <= 3) morningPeriods++;
        else if (period <= 5) middayPeriods++;
        else afternoonPeriods++;

        if (i > 0) {
          const gap = entries[i].period - entries[i-1].period;
          totalGaps += gap;
          gapCount++;
          metrics.minimumGapBetweenClasses = Math.min(metrics.minimumGapBetweenClasses, gap);
          
          if (gap === 1) {
            metrics.consecutiveClassCount++;
          }
        }
      }
    });

    const totalPeriods = this.schedule.length;
    metrics.morningPeriodUtilization = morningPeriods / totalPeriods;
    metrics.middayPeriodUtilization = middayPeriods / totalPeriods;
    metrics.afternoonPeriodUtilization = afternoonPeriods / totalPeriods;
    
    metrics.averageGapBetweenClasses = gapCount > 0 ? totalGaps / gapCount : 0;
    if (metrics.minimumGapBetweenClasses === Infinity) {
      metrics.minimumGapBetweenClasses = 0;
    }

    const weights = {
      distribution: 0.3,
      spacing: 0.3,
      periodUtilization: 0.2,
      constraints: 0.2
    };

    const normalizedDistribution = 1 - (metrics.standardDeviationClassesPerDay / metrics.averageClassesPerDay);
    const normalizedSpacing = metrics.averageGapBetweenClasses / 8;
    const normalizedPeriodUtilization = Math.min(
      metrics.morningPeriodUtilization,
      metrics.middayPeriodUtilization,
      metrics.afternoonPeriodUtilization
    ) * 3;

    metrics.totalScore = 
      weights.distribution * normalizedDistribution +
      weights.spacing * normalizedSpacing +
      weights.periodUtilization * normalizedPeriodUtilization +
      weights.constraints * metrics.constraintSatisfactionRate;

    return metrics;
  }

  public async runOptimizationExperiment(
    classes: Class[],
    configs: SchedulerConfig[],
    iterationsPerConfig: number
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const config of configs) {
      for (let i = 0; i < iterationsPerConfig; i++) {
        const startTime = Date.now();
        let improvementCount = 0;

        this.config = config;
        await this.initialize(classes);

        const sortedClasses = this.sortClassesByConstraints(classes);
        const success = await this.scheduleWithBacktracking(sortedClasses, this.startDate);

        if (!success) {
          console.warn(`Failed to generate schedule for config:`, config);
          continue;
        }

        const metrics = this.evaluateScheduleQuality();
        const runtime = Date.now() - startTime;

        results.push({
          metrics,
          schedule: this.getSchedule(),
          config,
          iterationCount: i + 1,
          improvementCount,
          runtime
        });
      }
    }

    return results;
  }
} 