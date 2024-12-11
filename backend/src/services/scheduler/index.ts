import { Class, ScheduleConstraints, ScheduleEntry, Period, DayOfWeek } from 'shared/types';
import { SlotFinder } from './slotFinder';
import { SchedulerOptimizer } from './optimizer';
import { MultiWeekOptimizer } from './multiWeekOptimizer';
import { sortByConstraints } from '../common/sorting';
import { OptimizationResult, Schedule, ScheduledClass } from './types';
import { SchedulerError, ConstraintViolationError, OptimizationError, RoomAssignmentError } from '../../errors/schedulerErrors';
import { SchedulerMetrics } from '../monitoring/schedulerMetrics';

export class SchedulerService {
  private classes: Map<string, Class> = new Map();
  private constraints: ScheduleConstraints;
  private schedule: ScheduleEntry[] = [];
  private optimizer: MultiWeekOptimizer | null = null;
  private metrics: SchedulerMetrics;

  constructor(constraints: ScheduleConstraints) {
    this.constraints = constraints;
    this.metrics = SchedulerMetrics.getInstance();
  }

  async initialize(classes: Class[]): Promise<void> {
    this.classes.clear();
    for (const cls of classes) {
      if (cls.id) {
        this.classes.set(cls.id, cls);
      }
    }
  }

  sortClassesByConstraints(classes: Class[]): Class[] {
    return [...classes].sort((a, b) => {
      // Sort by number of conflicts (most constrained first)
      const aConflicts = a.defaultConflicts.length;
      const bConflicts = b.defaultConflicts.length;
      return bConflicts - aConflicts;
    });
  }

  private isBlackoutPeriod(date: Date, period: number): boolean {
    return this.constraints.blackoutPeriods.some(bp => {
      const bpDate = bp.date.toISOString().split('T')[0];
      const testDate = date.toISOString().split('T')[0];
      return bpDate === testDate && bp.period === period;
    });
  }

  private getNextAvailableSlot(currentDate: Date, currentPeriod: number): { date: Date; period: number } {
    // Track classes per day and per week
    const classesPerDay = new Map<string, number>();
    const classesPerWeek = new Map<string, number>();
    
    // Count existing classes per day and week
    this.schedule.forEach((entry: ScheduleEntry) => {
      const dateKey = entry.assignedDate.toISOString().split('T')[0];
      const weekKey = this.getWeekKey(entry.assignedDate);
      
      classesPerDay.set(dateKey, (classesPerDay.get(dateKey) || 0) + 1);
      classesPerWeek.set(weekKey, (classesPerWeek.get(weekKey) || 0) + 1);
    });

    let date = new Date(currentDate);
    let period = currentPeriod;
    let weeksSearched = 0;
    const maxWeeksToLookAhead = 10; // Look up to 10 weeks ahead

    while (weeksSearched < maxWeeksToLookAhead) {
      // Try each day in the current week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const candidateDate = new Date(date);
        candidateDate.setDate(candidateDate.getDate() + dayOffset);
        
        // Skip weekends
        const dayOfWeek = candidateDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const dateKey = candidateDate.toISOString().split('T')[0];
        const weekKey = this.getWeekKey(candidateDate);
        const classesInDay = classesPerDay.get(dateKey) || 0;
        const classesInWeek = classesPerWeek.get(weekKey) || 0;
        
        // Check both daily and weekly constraints
        if (classesInDay < this.constraints.maxPeriodsPerDay && 
            classesInWeek < this.constraints.maxPeriodsPerWeek) {
          // Try each period in this day
          for (let p = 1; p <= 8; p++) {
            if (!this.isBlackoutPeriod(candidateDate, p)) {
              // Check if this would violate consecutive period constraints
              if (!this.wouldViolateConsecutiveConstraints(candidateDate, p)) {
                return { date: candidateDate, period: p };
              }
            }
          }
        }
      }

      // Move to next week
      date.setDate(date.getDate() + 7);
      weeksSearched++;
    }

    throw new ConstraintViolationError('Could not find an available slot within 10 weeks');
  }

  private getWeekKey(date: Date): string {
    // Get Monday of the week
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  private wouldViolateConsecutiveConstraints(date: Date, period: number): boolean {
    if (!this.constraints.avoidConsecutivePeriods) {
      return false;
    }

    const dateKey = date.toISOString().split('T')[0];
    const consecutiveBefore = this.schedule.some(entry => {
      const entryDate = entry.assignedDate.toISOString().split('T')[0];
      return entryDate === dateKey && entry.period === period - 1;
    });

    const consecutiveAfter = this.schedule.some(entry => {
      const entryDate = entry.assignedDate.toISOString().split('T')[0];
      return entryDate === dateKey && entry.period === period + 1;
    });

    return consecutiveBefore || consecutiveAfter;
  }

  async generateSchedule(startDate: Date): Promise<ScheduleEntry[]> {
    try {
      this.metrics.startGeneration();
      const sortStart = performance.now();
      const sortedClasses = this.sortClassesByConstraints(Array.from(this.classes.values()));
      const sortEnd = performance.now();

      this.metrics.recordPerformanceMetrics({
        sortingDurationMs: sortEnd - sortStart,
        totalClassCount: sortedClasses.length,
        schedulingDurationMs: 0  // Will be updated after scheduling
      });

      const scheduleStart = performance.now();
      const success = await this.scheduleWithBacktracking(sortedClasses, startDate);
      const scheduleEnd = performance.now();

      this.metrics.recordPerformanceMetrics({
        sortingDurationMs: sortEnd - sortStart,
        totalClassCount: sortedClasses.length,
        schedulingDurationMs: scheduleEnd - scheduleStart
      });
      
      if (!success) {
        throw new ConstraintViolationError('Could not find a valid schedule that satisfies all constraints');
      }

      this.metrics.endGeneration();
      this.metrics.logMetrics();
      
      return this.schedule;
    } catch (error) {
      if (error instanceof SchedulerError) {
        throw error;
      }
      throw new SchedulerError('Failed to generate schedule', 'GENERATION_FAILED');
    }
  }

  async scheduleWithBacktracking(classes: Class[], startDate: Date): Promise<boolean> {
    this.schedule = [];
    return this.backtrack(classes, 0, startDate);
  }

  private async backtrack(classes: Class[], index: number, startDate: Date): Promise<boolean> {
    // Base case: all classes scheduled
    if (index >= classes.length) {
      return true;
    }

    const cls = classes[index];
    if (!cls.id) return false;

    // Try each possible slot for this class
    let date = new Date(startDate);
    let weeksSearched = 0;
    const maxWeeksToLookAhead = 10;

    while (weeksSearched < maxWeeksToLookAhead) {
      // Get current distribution for this week
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const classesPerDay = new Map<number, number>();
      this.schedule.forEach(entry => {
        const entryDate = new Date(entry.assignedDate);
        if (entryDate >= weekStart && entryDate < weekEnd) {
          const dayOfWeek = ((entryDate.getDay() + 6) % 7) + 1; // Convert to 1-5 for Mon-Fri
          classesPerDay.set(dayOfWeek, (classesPerDay.get(dayOfWeek) || 0) + 1);
        }
      });

      // Sort days by how many classes they have (prefer days with fewer classes)
      const dayOrder = Array.from({ length: 5 }, (_, i) => i + 1)
        .sort((a, b) => (classesPerDay.get(a) || 0) - (classesPerDay.get(b) || 0));

      // Try each day in order of least used to most used
      for (const dayOffset of dayOrder) {
        const candidateDate = new Date(weekStart);
        candidateDate.setDate(candidateDate.getDate() + (dayOffset - 1));
        
        // Skip weekends
        const dayOfWeek = candidateDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Count classes already scheduled for this day
        const classesThisDay = (classesPerDay.get(((dayOfWeek + 6) % 7) + 1) || 0);
        
        // Skip if this day already has max classes
        if (classesThisDay >= this.constraints.maxPeriodsPerDay) continue;

        // Try each period in this day
        for (let period = 1; period <= 8; period++) {
          // Check if this slot would work
          if (this.isValidSlot(cls, candidateDate, period)) {
            // Try this slot
            this.schedule.push({
              classId: cls.id,
              assignedDate: new Date(candidateDate),
              period: period as Period
            });

            // Recursively try to schedule remaining classes
            if (await this.backtrack(classes, index + 1, startDate)) {
              return true;
            }

            // If we get here, this slot didn't work - remove it and try next
            this.schedule.pop();
          }
        }
      }

      // Move to next week
      date.setDate(date.getDate() + 7);
      weeksSearched++;
    }

    // No valid slot found for this class
    return false;
  }

  private isValidSlot(cls: Class, date: Date, period: number): boolean {
    try {
      // Check class-specific conflicts
      const dayOfWeek = date.getDay() as DayOfWeek;
      if (cls.defaultConflicts.some(c => c.dayOfWeek === dayOfWeek && c.period === period)) {
        this.metrics.recordConstraintViolation();
        throw new ConstraintViolationError(`Class ${cls.id} has a conflict on ${dayOfWeek} period ${period}`);
      }

      // Check blackout periods
      if (this.isBlackoutPeriod(date, period)) {
        this.metrics.recordConstraintViolation();
        throw new ConstraintViolationError(`Period ${period} on ${date.toISOString()} is a blackout period`);
      }

      // Get classes already scheduled for this day and week
      const dateKey = date.toISOString().split('T')[0];
      const weekKey = this.getWeekKey(date);
      
      const classesInDay = this.schedule.filter(e => 
        e.assignedDate.toISOString().split('T')[0] === dateKey
      ).length;

      const classesInWeek = this.schedule.filter(e => 
        this.getWeekKey(e.assignedDate) === weekKey
      ).length;

      // Check daily and weekly limits
      if (classesInDay >= this.constraints.maxPeriodsPerDay) {
        this.metrics.recordConstraintViolation();
        throw new ConstraintViolationError(`Maximum periods per day (${this.constraints.maxPeriodsPerDay}) exceeded`);
      }
      
      if (classesInWeek >= this.constraints.maxPeriodsPerWeek) {
        this.metrics.recordConstraintViolation();
        throw new ConstraintViolationError(`Maximum periods per week (${this.constraints.maxPeriodsPerWeek}) exceeded`);
      }

      // Check consecutive period constraints
      if (this.constraints.avoidConsecutivePeriods && 
          this.wouldViolateConsecutiveConstraints(date, period)) {
        this.metrics.recordConstraintViolation();
        throw new ConstraintViolationError('Consecutive periods are not allowed');
      }

      return true;
    } catch (error) {
      if (error instanceof ConstraintViolationError) {
        return false;
      }
      throw error;
    }
  }

  async optimizeSchedule(startDate: Date, maxTimeSeconds: number = 30): Promise<OptimizationResult> {
    try {
      this.metrics.startGeneration();
      console.group('Schedule Optimization');
      const totalStartTime = performance.now();

      console.log(`Parameters: startDate=${startDate}, maxTimeSeconds=${maxTimeSeconds}`);
      console.log(`Current schedule has ${this.schedule.length} entries`);
      console.log(`Constraints:`, this.constraints);

      // Convert ScheduleEntry[] to Schedule format
      console.group('Schedule Conversion');
      const conversionStart = performance.now();
      
      console.log('Converting schedule entries to scheduled classes...');
      const scheduledClasses: ScheduledClass[] = this.schedule.map(entry => {
        const cls = this.classes.get(entry.classId);
        if (!cls) {
          console.error(`Class not found for entry:`, entry);
          throw new Error(`Class not found: ${entry.classId}`);
        }

        const date = new Date(entry.assignedDate);
        const scheduledClass = {
          id: entry.classId,
          name: cls.classNumber,
          startTime: date,
          endTime: new Date(date.getTime() + 45 * 60 * 1000), // 45 minute classes
          dayOfWeek: ((date.getDay() + 6) % 7) + 1, // Convert to 1-5 for Mon-Fri
          period: entry.period,
          conflicts: [],
          isInConflict: false
        };
        return scheduledClass;
      });

      console.log(`Creating schedule object with ${scheduledClasses.length} classes`);
      const schedule: Schedule = {
        classes: scheduledClasses,
        metadata: {
          generatedAt: new Date(),
          version: 'v1',
          totalWeeks: Math.ceil(this.schedule.length / (this.constraints.maxPeriodsPerWeek || 15))
        }
      };
      console.log('Schedule metadata:', schedule.metadata);
      console.log(`Schedule conversion took ${(performance.now() - conversionStart).toFixed(2)}ms`);
      console.groupEnd();

      // Initialize optimizer if needed
      console.group('Optimizer Initialization');
      const initStart = performance.now();
      
      if (!this.optimizer) {
        console.log('Creating new MultiWeekOptimizer');
        this.optimizer = new MultiWeekOptimizer(this, startDate, maxTimeSeconds);
      } else {
        console.log('Reusing existing MultiWeekOptimizer');
      }
      
      console.log(`Initialization took ${(performance.now() - initStart).toFixed(2)}ms`);
      console.groupEnd();

      // Run optimization
      console.group('Optimization Process');
      const optimizationStart = performance.now();
      
      console.log(`Starting optimization with ${this.classes.size} total classes`);
      const result = await this.optimizer.optimizeMultiWeek(
        Array.from(this.classes.values()), 
        this.constraints
      );

      console.log('Optimization results:', {
        success: !!result.schedule,
        score: result.score,
        weeksUsed: result.weeksUsed,
        timeElapsed: result.timeElapsed
      });
      
      console.log(`Optimization process took ${(performance.now() - optimizationStart).toFixed(2)}ms`);
      console.groupEnd();

      const totalTime = performance.now() - totalStartTime;
      console.log(`\nTotal optimization time: ${totalTime.toFixed(2)}ms`);

      if (result.schedule) {
        this.metrics.recordQualityMetrics({
          averageClassesPerDay: result.score.metrics.dayDistribution * 100,
          dayUtilization: result.score.metrics.periodUtilization * 100,
          averageGapBetweenClasses: result.score.details.averageGapLength,
          consecutiveClassCount: result.score.details.classesPerDay.reduce((a, b) => a + b, 0),
          constraintSatisfactionRate: 1 - (result.score.metrics.timeGaps),
          totalScore: result.score.totalScore * 100
        });
      }

      this.metrics.endGeneration();
      this.metrics.logMetrics();

      return result;
    } catch (error) {
      console.group('Optimization Error');
      console.error('Error details:', error);
      console.error('Current state:', {
        scheduleLength: this.schedule.length,
        classesCount: this.classes.size,
        constraints: this.constraints
      });
      console.groupEnd();
      
      if (error instanceof SchedulerError) {
        throw error;
      }
      throw new OptimizationError('Failed to optimize schedule');
    } finally {
      console.groupEnd(); // Schedule Optimization
    }
  }

  getClasses(): Map<string, Class> {
    return this.classes;
  }

  getSchedule(): ScheduleEntry[] {
    return this.schedule;
  }
} 