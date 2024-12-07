import { Class, ScheduleConstraints, ScheduleEntry } from 'shared/types';

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

  async generateSchedule(startDate: Date): Promise<ScheduleEntry[]> {
    const schedule: ScheduleEntry[] = [];
    const sortedClasses = this.sortClassesByConstraints(Array.from(this.classes.values()));

    // TODO: Implement actual scheduling logic
    // For now, just create a simple schedule
    let currentDate = new Date(startDate);
    let currentPeriod = 1;

    for (const cls of sortedClasses) {
      if (cls.id) {
        schedule.push({
          classId: cls.id,
          assignedDate: new Date(currentDate),
          period: currentPeriod as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
        });

        currentPeriod++;
        if (currentPeriod > this.constraints.maxPeriodsPerDay) {
          currentPeriod = 1;
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }
      }
    }

    return schedule;
  }
} 