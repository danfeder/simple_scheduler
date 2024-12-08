import { Class, ScheduleConstraints, ScheduleEntry, Period } from 'shared/types';
import { SlotFinder } from './slotFinder';
import { SchedulerOptimizer } from './optimizer';
import { sortByConstraints } from '../common/sorting';

export class SchedulerService {
  private classes: Map<string, Class> = new Map();
  private constraints: ScheduleConstraints;

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
    let date = new Date(currentDate);
    let period = currentPeriod;

    while (true) {
      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        date = new Date(date.setDate(date.getDate() + 1));
        period = 1;
        continue;
      }

      // Check if current slot is blocked
      if (!this.isBlackoutPeriod(date, period)) {
        return { date, period };
      }

      // Move to next period or next day
      period++;
      if (period > this.constraints.maxPeriodsPerDay) {
        period = 1;
        date = new Date(date.setDate(date.getDate() + 1));
      }
    }
  }

  async generateSchedule(startDate: Date): Promise<ScheduleEntry[]> {
    const schedule: ScheduleEntry[] = [];
    const sortedClasses = this.sortClassesByConstraints(Array.from(this.classes.values()));

    let currentDate = new Date(startDate);
    let currentPeriod = 1;

    for (const cls of sortedClasses) {
      if (cls.id) {
        const slot = this.getNextAvailableSlot(currentDate, currentPeriod);
        schedule.push({
          classId: cls.id,
          assignedDate: new Date(slot.date),
          period: slot.period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
        });

        currentPeriod = slot.period + 1;
        if (currentPeriod > this.constraints.maxPeriodsPerDay) {
          currentPeriod = 1;
          currentDate = new Date(slot.date.setDate(slot.date.getDate() + 1));
        } else {
          currentDate = slot.date;
        }
      }
    }

    return schedule;
  }
} 