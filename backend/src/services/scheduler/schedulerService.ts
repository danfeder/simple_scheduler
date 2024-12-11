import { ScheduleConstraints, Class, Period, ScheduleEntry, DayOfWeek } from '../../../../shared/types';

export class SchedulerService {
  private constraints: ScheduleConstraints;
  private startDate: Date;
  private blackoutLookup: Map<string, Set<number>>;

  constructor(constraints: ScheduleConstraints, startDate: Date) {
    this.constraints = {
      ...constraints,
      blackoutPeriods: this.filterValidBlackoutPeriods(constraints.blackoutPeriods)
    };
    this.startDate = startDate;
    this.blackoutLookup = new Map();
    this.initializeBlackoutLookup();
  }

  private filterValidBlackoutPeriods(blackoutPeriods: { date: string; period: number }[]): { date: string; period: number }[] {
    return blackoutPeriods.filter(bp => {
      const date = new Date(bp.date);
      return (
        !isNaN(date.getTime()) && // Valid date
        date.getDay() !== DayOfWeek.Sunday &&
        date.getDay() !== DayOfWeek.Saturday &&
        bp.period >= 1 &&
        bp.period <= 8
      );
    });
  }

  private initializeBlackoutLookup(): void {
    this.blackoutLookup.clear();
    for (const blackout of this.constraints.blackoutPeriods) {
      const key = blackout.date;
      if (!this.blackoutLookup.has(key)) {
        this.blackoutLookup.set(key, new Set());
      }
      this.blackoutLookup.get(key)!.add(blackout.period);
    }
  }

  private isBlackedOut(date: string, period: number): boolean {
    const periods = this.blackoutLookup.get(date);
    return periods ? periods.has(period) : false;
  }

  private getAvailableSlots(date: Date): number[] {
    const dateStr = date.toISOString().split('T')[0];
    const allPeriods = Array.from({ length: 8 }, (_, i) => i + 1);
    return allPeriods.filter(period => !this.isBlackedOut(dateStr, period));
  }

  private isValidSlot(date: Date, period: number): boolean {
    const day = date.getDay();
    if (day === DayOfWeek.Sunday || day === DayOfWeek.Saturday) {
      return false;
    }
    return !this.isBlackedOut(date.toISOString().split('T')[0], period);
  }

  private distributeClasses(classes: Class[]): ScheduleEntry[] {
    const schedule: ScheduleEntry[] = [];
    const classesPerDay = new Map<string, number>();
    const classesPerWeek = new Map<string, number>();

    for (const classDoc of classes) {
      let scheduled = false;
      const weekStart = new Date(this.startDate);
      
      while (!scheduled) {
        for (let day = 0; day < 5 && !scheduled; day++) {
          const currentDate = new Date(weekStart);
          currentDate.setDate(weekStart.getDate() + day);
          const dateStr = currentDate.toISOString().split('T')[0];
          const weekStr = weekStart.toISOString().split('T')[0];

          const dailyCount = classesPerDay.get(dateStr) || 0;
          const weeklyCount = classesPerWeek.get(weekStr) || 0;

          if (dailyCount < this.constraints.maxPeriodsPerDay &&
              weeklyCount < this.constraints.maxPeriodsPerWeek) {
            
            const availableSlots = this.getAvailableSlots(currentDate);
            for (const period of availableSlots) {
              if (this.isValidSlot(currentDate, period)) {
                schedule.push({
                  classId: classDoc.id,
                  date: currentDate,
                  period
                });
                
                classesPerDay.set(dateStr, dailyCount + 1);
                classesPerWeek.set(weekStr, weeklyCount + 1);
                scheduled = true;
                break;
              }
            }
          }
        }
        
        if (!scheduled) {
          weekStart.setDate(weekStart.getDate() + 7);
        }
      }
    }

    return schedule;
  }

  public async generateSchedule(classes: Class[]): Promise<ScheduleEntry[]> {
    return this.distributeClasses(classes);
  }
} 