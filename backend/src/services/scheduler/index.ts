import { Class, ScheduleConstraints, ScheduleEntry, Period, DayOfWeek } from 'shared/types';
import { SlotFinder } from './slotFinder';
import { SchedulerOptimizer } from './optimizer';
import { sortByConstraints } from '../common/sorting';

export class SchedulerService {
  private classes: Map<string, Class> = new Map();
  private constraints: ScheduleConstraints;
  private schedule: ScheduleEntry[] = [];

  constructor(constraints: ScheduleConstraints) {
    this.constraints = constraints;
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

    throw new Error('Could not find an available slot within 10 weeks');
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
    const sortedClasses = this.sortClassesByConstraints(Array.from(this.classes.values()));
    const success = await this.scheduleWithBacktracking(sortedClasses, startDate);
    
    if (!success) {
      throw new Error('Could not find a valid schedule with the given constraints');
    }
    
    return this.schedule;
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
      // Try each day in the current week
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const candidateDate = new Date(date);
        candidateDate.setDate(candidateDate.getDate() + dayOffset);
        
        // Skip weekends
        const dayOfWeek = candidateDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

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
    // Check class-specific conflicts
    const dayOfWeek = date.getDay() as DayOfWeek;
    if (cls.defaultConflicts.some(c => c.dayOfWeek === dayOfWeek && c.period === period)) {
      return false;
    }

    // Check blackout periods
    if (this.isBlackoutPeriod(date, period)) {
      return false;
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
    if (classesInDay >= this.constraints.maxPeriodsPerDay ||
        classesInWeek >= this.constraints.maxPeriodsPerWeek) {
      return false;
    }

    // Check consecutive period constraints
    if (this.constraints.avoidConsecutivePeriods && 
        this.wouldViolateConsecutiveConstraints(date, period)) {
      return false;
    }

    return true;
  }

  getSchedule(): ScheduleEntry[] {
    return this.schedule;
  }

  getClasses(): Map<string, Class> {
    return this.classes;
  }
} 