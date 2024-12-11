import { SchedulerService } from '../../services/scheduler/schedulerService';
import { ScheduleConstraints, Class, Period, ScheduleEntry, BlackoutPeriod } from '../../../../shared/types';

describe('Constraint Solver Integration', () => {
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

  describe('End-to-End Flow Tests', () => {
    it('should handle blackout period creation and scheduling', async () => {
      const constraints = {
        ...mockConstraints,
        blackoutPeriods: [
          { date: '2024-01-01', period: 1 }, // Monday, Period 1
          { date: '2024-01-01', period: 2 }  // Monday, Period 2
        ]
      };

      const scheduler = new SchedulerService(constraints, startDate);
      const schedule = await scheduler.generateSchedule(testClasses);

      // Verify no classes are scheduled during blackout periods
      schedule.forEach(entry => {
        const entryDate = entry.date.toISOString().split('T')[0];
        const isBlackedOut = constraints.blackoutPeriods.some(
          bp => bp.date === entryDate && bp.period === entry.period
        );
        expect(isBlackedOut).toBeFalsy();
      });
    });

    it('should handle complex blackout patterns', async () => {
      // Create a pattern: All morning periods (1-4) on Monday and Tuesday
      const blackoutPeriods: BlackoutPeriod[] = [];
      for (let day = 1; day <= 2; day++) {
        for (let period = 1; period <= 4; period++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + day - 1);
          blackoutPeriods.push({
            date: date.toISOString().split('T')[0],
            period
          });
        }
      }

      const constraints = {
        ...mockConstraints,
        blackoutPeriods
      };

      const scheduler = new SchedulerService(constraints, startDate);
      const schedule = await scheduler.generateSchedule(testClasses);

      // Verify no morning classes on Monday and Tuesday
      const mondayTuesdaySchedule = schedule.filter(entry => {
        const day = entry.date.getDay();
        return day === 1 || day === 2; // Monday or Tuesday
      });

      expect(mondayTuesdaySchedule.some(entry => entry.period <= 4)).toBeFalsy();
    });

    it('should optimize schedule around blackout constraints', async () => {
      // Block out scattered periods to test optimization
      const blackoutPeriods: BlackoutPeriod[] = [
        { date: '2024-01-01', period: 2 }, // Monday
        { date: '2024-01-01', period: 4 },
        { date: '2024-01-02', period: 1 }, // Tuesday
        { date: '2024-01-02', period: 3 },
        { date: '2024-01-03', period: 2 }, // Wednesday
        { date: '2024-01-03', period: 5 }
      ];

      const constraints = {
        ...mockConstraints,
        blackoutPeriods
      };

      const scheduler = new SchedulerService(constraints, startDate);
      const schedule = await scheduler.generateSchedule(testClasses);

      // Verify schedule is optimized
      const classDistribution = new Map<string, number>();
      schedule.forEach(entry => {
        const key = entry.date.toISOString().split('T')[0];
        classDistribution.set(key, (classDistribution.get(key) || 0) + 1);
      });

      // Check if classes are evenly distributed across available slots
      const distributions = Array.from(classDistribution.values());
      const maxDiff = Math.max(...distributions) - Math.min(...distributions);
      expect(maxDiff).toBeLessThanOrEqual(1); // Should be balanced
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of constraints efficiently', async () => {
      // Create a large number of blackout periods
      const blackoutPeriods: BlackoutPeriod[] = [];
      const startDate = new Date('2024-01-01');
      
      // Create 1000 blackout periods across multiple weeks
      for (let i = 0; i < 1000; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + Math.floor(i / 8));
        blackoutPeriods.push({
          date: date.toISOString().split('T')[0],
          period: (i % 8) + 1
        });
      }

      const constraints = {
        ...mockConstraints,
        blackoutPeriods
      };

      const scheduler = new SchedulerService(constraints, startDate);
      
      // Create a larger set of classes
      const largeClassSet = Array.from({ length: 50 }, (_, i) => ({
        id: i.toString(),
        classNumber: `Class-${i}`,
        grade: Math.ceil(i / 5).toString(),
        defaultConflicts: [],
        active: true
      }));

      const startTime = performance.now();
      const schedule = await scheduler.generateSchedule(largeClassSet);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete in less than 5 seconds
      expect(schedule.length).toBe(largeClassSet.length);
    });
  });
}); 