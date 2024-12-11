/// <reference types="jest" />
import { SchedulerService } from '../../services/scheduler/schedulerService';
import { ScheduleConstraints, Class, Period, ScheduleEntry } from '../../../../shared/types';

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

  it('should respect blackout periods when generating schedule', async () => {
    const blackoutConstraints = {
      ...mockConstraints,
      blackoutPeriods: [
        { date: '2024-01-01', period: 1 }, // Monday, Period 1
        { date: '2024-01-01', period: 2 }  // Monday, Period 2
      ]
    };

    const scheduler = new SchedulerService(blackoutConstraints, startDate);
    const schedule = await scheduler.generateSchedule(testClasses);

    // Verify no classes are scheduled during blackout periods
    schedule.forEach(entry => {
      const entryDate = entry.date.toISOString().split('T')[0];
      const isBlackedOut = blackoutConstraints.blackoutPeriods.some(
        bp => bp.date === entryDate && bp.period === entry.period
      );
      expect(isBlackedOut).toBeFalsy();
    });
  });

  it('should handle multiple blackout periods across days', async () => {
    const blackoutConstraints = {
      ...mockConstraints,
      blackoutPeriods: [
        { date: '2024-01-01', period: 1 }, // Monday
        { date: '2024-01-02', period: 2 }, // Tuesday
        { date: '2024-01-03', period: 3 }  // Wednesday
      ]
    };

    const scheduler = new SchedulerService(blackoutConstraints, startDate);
    const schedule = await scheduler.generateSchedule(testClasses);

    // Verify schedule respects all blackout periods
    expect(schedule.length).toBe(testClasses.length);
    expect(schedule.some(entry => 
      entry.date.toISOString().split('T')[0] === '2024-01-01' && entry.period === 1
    )).toBeFalsy();
    expect(schedule.some(entry => 
      entry.date.toISOString().split('T')[0] === '2024-01-02' && entry.period === 2
    )).toBeFalsy();
    expect(schedule.some(entry => 
      entry.date.toISOString().split('T')[0] === '2024-01-03' && entry.period === 3
    )).toBeFalsy();
  });

  it('should filter out invalid blackout periods', async () => {
    const invalidConstraints = {
      ...mockConstraints,
      blackoutPeriods: [
        { date: '2024-01-06', period: 1 }, // Saturday - should be filtered
        { date: '2024-01-07', period: 1 }, // Sunday - should be filtered
        { date: '2024-01-01', period: 0 }, // Invalid period - should be filtered
        { date: '2024-01-01', period: 9 }, // Invalid period - should be filtered
        { date: '2024-01-02', period: 3 }  // Valid period - should be respected
      ]
    };

    const scheduler = new SchedulerService(invalidConstraints, startDate);
    const schedule = await scheduler.generateSchedule(testClasses);
    
    // Weekend slots should never be used, regardless of blackout periods
    expect(schedule.some(entry => 
      entry.date.getDay() === 6 // Saturday
    )).toBeFalsy();
    expect(schedule.some(entry => 
      entry.date.getDay() === 0 // Sunday
    )).toBeFalsy();

    // Invalid period numbers should be ignored
    expect(schedule.some(entry => 
      entry.period === 0 || entry.period === 9
    )).toBeFalsy();

    // Valid blackout period should be respected
    expect(schedule.some(entry => 
      entry.date.toISOString().split('T')[0] === '2024-01-02' && entry.period === 3
    )).toBeFalsy();

    // Other valid periods should be available
    expect(schedule.some(entry => 
      entry.date.toISOString().split('T')[0] === '2024-01-02' && entry.period === 1
    )).toBeTruthy();
  });
}); 