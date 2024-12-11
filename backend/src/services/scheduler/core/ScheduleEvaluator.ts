import { Schedule, ScheduleQuality, ScheduleConstraints } from '../../../../shared/types/schedule';
import { IScheduleEvaluator } from '../../../../shared/types/services';

export interface EvaluatorConfig {
  maxGapSize: number;
  minDailyClasses: number;
  maxDailyClasses: number;
  targetClassesPerDay: number;
  weights: {
    dayDistribution: number;
    timeGaps: number;
    periodUtilization: number;
  };
}

export class ScheduleEvaluator implements IScheduleEvaluator {
  constructor(private config: EvaluatorConfig) {}

  public evaluateSchedule(schedule: Schedule): ScheduleQuality {
    const dayDistribution = this.calculateDayDistribution(schedule);
    const timeGaps = this.calculateTimeGaps(schedule);
    const periodUtilization = this.calculatePeriodUtilization(schedule);

    // Calculate weighted total score
    const totalScore = 
      (dayDistribution * this.config.weights.dayDistribution) +
      (timeGaps * this.config.weights.timeGaps) +
      (periodUtilization * this.config.weights.periodUtilization);

    const normalizedScore = totalScore / (
      this.config.weights.dayDistribution +
      this.config.weights.timeGaps +
      this.config.weights.periodUtilization
    );

    return {
      totalScore: normalizedScore,
      metrics: {
        dayDistribution,
        timeGaps,
        periodUtilization
      },
      details: {
        classesPerDay: this.getClassesPerDay(schedule),
        averageGapLength: this.calculateAverageGapLength(schedule),
        morningToAfternoonRatio: this.calculateMorningAfternoonRatio(schedule)
      }
    };
  }

  public validateConstraints(schedule: Schedule, constraints: ScheduleConstraints): boolean {
    // Check max periods per day
    const classesPerDay = this.getClassesPerDay(schedule);
    if (classesPerDay.some(count => count > constraints.maxPeriodsPerDay)) {
      return false;
    }

    // Check max consecutive periods
    if (constraints.maxConsecutivePeriods) {
      const blocks = this.findContinuousBlocks(schedule);
      if (blocks.some(blockSize => blockSize > constraints.maxConsecutivePeriods)) {
        return false;
      }
    }

    // Check blackout periods
    for (const blackout of constraints.blackoutPeriods) {
      const hasClassInBlackout = schedule.classes.some(cls => {
        const classDate = new Date(cls.startTime);
        return classDate.getTime() === blackout.date.getTime() && 
               cls.period === blackout.period;
      });
      if (hasClassInBlackout) {
        return false;
      }
    }

    return true;
  }

  public calculateDayDistribution(schedule: Schedule): number {
    let score = 1.0;
    const dailyClassCounts = this.getClassesPerDay(schedule);
    
    // Penalize for uneven distribution
    const avgClassesPerDay = this.calculateAverage(dailyClassCounts);
    const distribution = dailyClassCounts.map(count => 
      Math.abs(count - this.config.targetClassesPerDay)
    );
    
    // Normalize penalties between 0 and 1
    const distributionPenalty = Math.min(
      1.0,
      this.calculateAverage(distribution) / this.config.targetClassesPerDay
    );
    
    score -= distributionPenalty * 0.5;

    // Penalize for violating min/max daily classes
    const minMaxPenalty = dailyClassCounts.reduce((penalty, count) => {
      if (count < this.config.minDailyClasses) {
        penalty += (this.config.minDailyClasses - count) / this.config.minDailyClasses;
      }
      if (count > this.config.maxDailyClasses) {
        penalty += (count - this.config.maxDailyClasses) / count;
      }
      return penalty;
    }, 0) / dailyClassCounts.length;

    score -= minMaxPenalty * 0.5;
    
    return Math.max(0, score);
  }

  public calculateTimeGaps(schedule: Schedule): number {
    let score = 1.0;
    const gaps = this.findScheduleGaps(schedule);
    
    // Penalize for gaps larger than maxGapSize
    const gapPenalties = gaps.map(gap => {
      if (gap > this.config.maxGapSize) {
        return (gap - this.config.maxGapSize) / gap;
      }
      return 0;
    });
    
    const avgGapPenalty = this.calculateAverage(gapPenalties);
    score -= avgGapPenalty;

    return Math.max(0, score);
  }

  public calculatePeriodUtilization(schedule: Schedule): number {
    const blocks = this.findContinuousBlocks(schedule);
    const totalClasses = schedule.classes.length;
    
    if (totalClasses === 0) return 0;

    // Calculate the ratio of classes that are part of continuous blocks
    const classesInBlocks = blocks.reduce((sum, blockSize) => sum + blockSize, 0);
    const blockRatio = classesInBlocks / totalClasses;

    // We want a good balance of continuous blocks, but not too many
    // Optimal ratio is around 0.6-0.8 of classes in continuous blocks
    const optimalRatio = 0.7;
    const score = 1 - Math.abs(blockRatio - optimalRatio);

    return Math.max(0, score);
  }

  private getClassesPerDay(schedule: Schedule): number[] {
    const dailyCounts = new Array(5).fill(0); // Monday-Friday
    
    for (const cls of schedule.classes) {
      const date = new Date(cls.startTime);
      const dayIndex = date.getDay() - 1; // 0-4 for Monday-Friday
      if (dayIndex >= 0 && dayIndex < 5) {
        dailyCounts[dayIndex]++;
      }
    }

    return dailyCounts;
  }

  private findScheduleGaps(schedule: Schedule): number[] {
    const gaps: number[] = [];
    
    // Group classes by day
    const classesByDay = new Map<number, number[]>();
    for (const cls of schedule.classes) {
      const date = new Date(cls.startTime);
      const dayIndex = date.getDay() - 1; // 0-4 for Monday-Friday
      if (!classesByDay.has(dayIndex)) {
        classesByDay.set(dayIndex, []);
      }
      classesByDay.get(dayIndex)!.push(cls.period);
    }

    // Find gaps for each day
    for (const periods of classesByDay.values()) {
      periods.sort((a, b) => a - b);
      
      // Calculate gaps between consecutive periods
      for (let i = 1; i < periods.length; i++) {
        const gap = periods[i] - periods[i-1] - 1;
        if (gap > 0) {
          gaps.push(gap);
        }
      }
    }

    return gaps;
  }

  private findContinuousBlocks(schedule: Schedule): number[] {
    const blocks: number[] = [];
    
    // Group classes by day
    const classesByDay = new Map<number, number[]>();
    for (const cls of schedule.classes) {
      const date = new Date(cls.startTime);
      const dayIndex = date.getDay() - 1; // 0-4 for Monday-Friday
      if (!classesByDay.has(dayIndex)) {
        classesByDay.set(dayIndex, []);
      }
      classesByDay.get(dayIndex)!.push(cls.period);
    }

    // Find continuous blocks for each day
    for (const periods of classesByDay.values()) {
      periods.sort((a, b) => a - b);
      
      let currentBlock = 1;
      // Count consecutive periods
      for (let i = 1; i < periods.length; i++) {
        if (periods[i] === periods[i-1] + 1) {
          currentBlock++;
        } else {
          if (currentBlock > 1) {
            blocks.push(currentBlock);
          }
          currentBlock = 1;
        }
      }
      // Don't forget the last block
      if (currentBlock > 1) {
        blocks.push(currentBlock);
      }
    }

    return blocks;
  }

  private calculateAverageGapLength(schedule: Schedule): number {
    const gaps = this.findScheduleGaps(schedule);
    return this.calculateAverage(gaps);
  }

  private calculateMorningAfternoonRatio(schedule: Schedule): number {
    let morningClasses = 0;
    let afternoonClasses = 0;

    for (const cls of schedule.classes) {
      if (cls.period <= 4) {
        morningClasses++;
      } else {
        afternoonClasses++;
      }
    }

    if (afternoonClasses === 0) return morningClasses > 0 ? Infinity : 1;
    return morningClasses / afternoonClasses;
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
} 