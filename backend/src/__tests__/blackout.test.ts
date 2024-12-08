/// <reference types="jest" />
import { SchedulerService } from '../services/scheduler.service';
import { ScheduleConstraints, Class, Period, ScheduleEntry } from '../../../shared/types';

describe('Blackout Period Functionality', () => {
  const startDate = new Date('2024-01-01'); // Monday
  const mockConstraints: ScheduleConstraints = {
    maxPeriodsPerDay: 4,
    maxPeriodsPerWeek: 15,
    maxConsecutivePeriods: 2,
    avoidConsecutivePeriods: true,
    blackoutPeriods: []
  };

  const testClasses: Class[] = [
    {
      id: '1',
      classNumber: '1-101',
      grade: '1',
      defaultConflicts: [],
      active: true
    },
    {
      id: '2',
      classNumber: '2-201',
      grade: '2',
      defaultConflicts: [],
      active: true
    }
  ];

  describe('Schedule Generation with Blackouts', () => {
    it('should not schedule classes during blackout periods', async () => {
      const blackoutConstraints: ScheduleConstraints = {
        ...mockConstraints,
        blackoutPeriods: [
          { date: new Date('2024-01-01'), period: 1 },
          { date: new Date('2024-01-01'), period: 2 }
        ]
      };

      const scheduler = new SchedulerService(blackoutConstraints);
      await scheduler.initialize(testClasses);
      const schedule = await scheduler.generateSchedule(startDate);
      
      // Check that no classes are scheduled during blackout periods
      for (const entry of schedule) {
        const entryDate = entry.assignedDate.toISOString().split('T')[0];
        const isBlackout = blackoutConstraints.blackoutPeriods.some(
          bp => bp.date.toISOString().split('T')[0] === entryDate && bp.period === entry.period
        );
        expect(isBlackout).toBe(false);
      }
    });

    it('should handle fully blocked days', async () => {
      // Block all periods for a day
      const blackoutConstraints: ScheduleConstraints = {
        ...mockConstraints,
        blackoutPeriods: Array.from({ length: 8 }, (_, i) => ({
          date: new Date('2024-01-01'),
          period: (i + 1) as Period
        }))
      };

      const scheduler = new SchedulerService(blackoutConstraints);
      await scheduler.initialize(testClasses);
      const schedule = await scheduler.generateSchedule(startDate);

      // Check that no classes are scheduled on the fully blocked day
      expect(schedule.some((entry: ScheduleEntry) => 
        entry.assignedDate.toISOString().split('T')[0] === '2024-01-01'
      )).toBe(false);
    });

    it('should handle blocked periods across multiple days', async () => {
      // Block period 1 across multiple days
      const blackoutConstraints: ScheduleConstraints = {
        ...mockConstraints,
        blackoutPeriods: [
          { date: new Date('2024-01-01'), period: 1 },
          { date: new Date('2024-01-02'), period: 1 },
          { date: new Date('2024-01-03'), period: 1 }
        ]
      };

      const scheduler = new SchedulerService(blackoutConstraints);
      await scheduler.initialize(testClasses);
      const schedule = await scheduler.generateSchedule(startDate);

      // Check that no classes are scheduled in period 1 on blocked days
      for (const entry of schedule) {
        if (entry.period === 1) {
          const entryDate = entry.assignedDate.toISOString().split('T')[0];
          expect(['2024-01-01', '2024-01-02', '2024-01-03']).not.toContain(entryDate);
        }
      }
    });
  });
}); 