import { StorageService } from '../StorageService';
import { ScheduleConstraints } from 'shared/types';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockConstraints: ScheduleConstraints;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storageService = StorageService.getInstance();
    
    // Set up base mock constraints
    mockConstraints = {
      maxPeriodsPerDay: 8,
      maxPeriodsPerWeek: 40,
      maxConsecutivePeriods: 3,
      avoidConsecutivePeriods: false,
      blackoutPeriods: []
    };
  });

  describe('Blackout Period Format Conversion', () => {
    test('should convert single period blackouts to modern format', async () => {
      const date = new Date('2024-01-15');
      mockConstraints.blackoutPeriods = [
        { date, period: 1 },
        { date, period: 2 },
        { date, period: 3 }
      ];

      await storageService.saveConstraints(mockConstraints);
      const storedData = JSON.parse(localStorage.getItem('schedule_constraints')!);

      expect(storedData.blackoutPeriods).toHaveLength(1);
      expect(storedData.blackoutPeriods[0]).toEqual({
        date: date.toISOString(),
        periods: [1, 2, 3],
        allDay: undefined
      });
    });

    test('should convert modern format back to legacy format', async () => {
      const date = new Date('2024-01-15');
      // Store in modern format
      localStorage.setItem('schedule_constraints', JSON.stringify({
        ...mockConstraints,
        blackoutPeriods: [{
          date: date.toISOString(),
          periods: [1, 2, 3]
        }]
      }));

      const retrieved = await storageService.getConstraints();
      expect(retrieved?.blackoutPeriods).toHaveLength(3);
      expect(retrieved?.blackoutPeriods).toEqual([
        { date: expect.any(Date), period: 1 },
        { date: expect.any(Date), period: 2 },
        { date: expect.any(Date), period: 3 }
      ]);
    });

    test('should handle allDay blackouts correctly', async () => {
      const date = new Date('2024-01-15');
      // Store with allDay flag
      localStorage.setItem('schedule_constraints', JSON.stringify({
        ...mockConstraints,
        blackoutPeriods: [{
          date: date.toISOString(),
          allDay: true
        }]
      }));

      const retrieved = await storageService.getConstraints();
      expect(retrieved?.blackoutPeriods).toHaveLength(8); // 8 periods for all day
      expect(retrieved?.blackoutPeriods.every(bp => bp.date instanceof Date)).toBe(true);
      expect(retrieved?.blackoutPeriods.map(bp => bp.period)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    test('should handle multiple dates correctly', async () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      mockConstraints.blackoutPeriods = [
        { date: date1, period: 1 },
        { date: date1, period: 2 },
        { date: date2, period: 1 },
        { date: date2, period: 3 }
      ];

      await storageService.saveConstraints(mockConstraints);
      const storedData = JSON.parse(localStorage.getItem('schedule_constraints')!);

      expect(storedData.blackoutPeriods).toHaveLength(2);
      expect(storedData.blackoutPeriods).toEqual([
        {
          date: date1.toISOString(),
          periods: [1, 2]
        },
        {
          date: date2.toISOString(),
          periods: [1, 3]
        }
      ]);
    });

    test('should handle empty blackout periods', async () => {
      await storageService.saveConstraints(mockConstraints);
      const retrieved = await storageService.getConstraints();
      expect(retrieved?.blackoutPeriods).toEqual([]);
    });

    test('should preserve other constraint properties', async () => {
      await storageService.saveConstraints(mockConstraints);
      const retrieved = await storageService.getConstraints();
      
      expect(retrieved).toEqual(expect.objectContaining({
        maxPeriodsPerDay: mockConstraints.maxPeriodsPerDay,
        maxPeriodsPerWeek: mockConstraints.maxPeriodsPerWeek,
        maxConsecutivePeriods: mockConstraints.maxConsecutivePeriods,
        avoidConsecutivePeriods: mockConstraints.avoidConsecutivePeriods
      }));
    });
  });
}); 