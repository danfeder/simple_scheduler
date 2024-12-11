import { ScheduleConstraints } from 'shared/types';

// Internal types for format conversion
interface LegacyBlackoutPeriod {
  date: Date;
  period: number;
}

interface ModernBlackoutPeriod {
  date: Date;
  periods?: number[];
  allDay?: boolean;
}

export class StorageService {
  private static instance: StorageService;
  private readonly CONSTRAINTS_KEY = 'schedule_constraints';

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Convert frontend format to backend format
  private convertToModernFormat(blackoutPeriods: LegacyBlackoutPeriod[]): ModernBlackoutPeriod[] {
    const groupedByDate = new Map<string, ModernBlackoutPeriod>();
    
    blackoutPeriods.forEach(bp => {
      const dateStr = bp.date.toISOString().split('T')[0];
      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, {
          date: bp.date,
          periods: []
        });
      }
      groupedByDate.get(dateStr)!.periods!.push(bp.period);
    });

    return Array.from(groupedByDate.values());
  }

  // Convert backend format to frontend format
  private convertToLegacyFormat(blackoutPeriods: ModernBlackoutPeriod[]): LegacyBlackoutPeriod[] {
    return blackoutPeriods.flatMap(bp => {
      if (bp.allDay) {
        return Array.from({ length: 8 }, (_, i) => ({
          date: bp.date,
          period: i + 1
        }));
      }
      return (bp.periods || []).map(period => ({
        date: bp.date,
        period
      }));
    });
  }

  async getConstraints(): Promise<ScheduleConstraints | null> {
    try {
      const storedData = localStorage.getItem(this.CONSTRAINTS_KEY);
      if (!storedData) return null;

      const constraints = JSON.parse(storedData);
      const blackoutPeriods = constraints.blackoutPeriods.map((bp: any) => ({
        ...bp,
        date: new Date(bp.date)
      }));

      // Convert to legacy format for frontend compatibility
      constraints.blackoutPeriods = this.convertToLegacyFormat(blackoutPeriods);
      
      return constraints;
    } catch (error) {
      console.error('Failed to get constraints:', error);
      return null;
    }
  }

  async saveConstraints(constraints: ScheduleConstraints): Promise<ScheduleConstraints> {
    try {
      // Convert to modern format for storage
      const modernConstraints = {
        ...constraints,
        blackoutPeriods: this.convertToModernFormat(constraints.blackoutPeriods)
      };

      localStorage.setItem(this.CONSTRAINTS_KEY, JSON.stringify(modernConstraints));
      return constraints; // Return original format for frontend
    } catch (error) {
      console.error('Failed to save constraints:', error);
      throw error;
    }
  }

  async clearConstraints(): Promise<void> {
    try {
      localStorage.removeItem(this.CONSTRAINTS_KEY);
    } catch (error) {
      console.error('Failed to clear constraints:', error);
      throw error;
    }
  }
} 