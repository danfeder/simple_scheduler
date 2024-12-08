import { SchedulerService } from '../services/scheduler/schedulerService';
import { Class, Period, ScheduleConstraints, DayOfWeek, GradeLevel, BlackoutPeriod } from '../../../shared/types';

describe('SchedulerService', () => {
    const mockConstraints: ScheduleConstraints = {
        maxPeriodsPerDay: 2,
        maxPeriodsPerWeek: 6,
        blackoutPeriods: [],
        avoidConsecutivePeriods: true,
        maxConsecutivePeriods: 2
    };

    const testClasses: Class[] = [
        {
            id: '1',
            classNumber: '1-101',
            grade: '1' as GradeLevel,
            defaultConflicts: [
                { dayOfWeek: 1 as DayOfWeek, period: 1 as Period }
            ],
            active: true
        },
        {
            id: '2',
            classNumber: '2-201',
            grade: '2' as GradeLevel,
            defaultConflicts: [
                { dayOfWeek: 1 as DayOfWeek, period: 2 as Period }
            ],
            active: true
        },
        {
            id: '3',
            classNumber: '3-301',
            grade: '3' as GradeLevel,
            defaultConflicts: [
                { dayOfWeek: 1 as DayOfWeek, period: 3 as Period }
            ],
            active: true
        }
    ];

    describe('Scheduling Logic', () => {
        let scheduler: SchedulerService;
        const startDate = new Date('2024-01-01'); // A Monday

        beforeEach(async () => {
            scheduler = new SchedulerService(startDate, mockConstraints);
            await scheduler.initialize(testClasses);
        });

        it('should schedule classes without conflicts', async () => {
            const sortedClasses = scheduler.sortClassesByConstraints(testClasses);
            const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();
            expect(schedule.length).toBeGreaterThan(0);

            // Check for conflicts
            const scheduleByDayAndPeriod = new Map<string, string>();
            for (const entry of schedule) {
                const key = `${entry.assignedDate.toISOString()}_${entry.period}`;
                expect(scheduleByDayAndPeriod.has(key)).toBe(false);
                scheduleByDayAndPeriod.set(key, entry.classId);
            }
        });

        it('should respect maxPeriodsPerDay constraint', async () => {
            const sortedClasses = scheduler.sortClassesByConstraints(testClasses);
            const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();

            // Group by day
            const classesByDay = new Map<string, number>();
            for (const entry of schedule) {
                const dayKey = entry.assignedDate.toISOString().split('T')[0];
                classesByDay.set(dayKey, (classesByDay.get(dayKey) || 0) + 1);
            }

            // Check that no day exceeds maxPeriodsPerDay
            for (const count of classesByDay.values()) {
                expect(count).toBeLessThanOrEqual(mockConstraints.maxPeriodsPerDay);
            }
        });

        it('should avoid consecutive periods when specified', async () => {
            const sortedClasses = scheduler.sortClassesByConstraints(testClasses);
            const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();

            // Group by day and check for consecutive periods
            const scheduleByDay = new Map<string, number[]>();
            for (const entry of schedule) {
                const dayKey = entry.assignedDate.toISOString().split('T')[0];
                if (!scheduleByDay.has(dayKey)) {
                    scheduleByDay.set(dayKey, []);
                }
                scheduleByDay.get(dayKey)!.push(entry.period);
            }

            // Check that no consecutive periods exist
            for (const periods of scheduleByDay.values()) {
                periods.sort((a, b) => a - b);
                for (let i = 1; i < periods.length; i++) {
                    expect(periods[i] - periods[i - 1]).toBeGreaterThan(1);
                }
            }
        });

        it('should respect class-specific conflicts', async () => {
            const sortedClasses = scheduler.sortClassesByConstraints(testClasses);
            const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();

            // Check that no class is scheduled during its conflict times
            for (const entry of schedule) {
                const classDoc = testClasses.find(c => c.id === entry.classId)!;
                const dayOfWeek = entry.assignedDate.getDay() as DayOfWeek;
                
                const hasConflict = classDoc.defaultConflicts?.some(
                    conflict => 
                        conflict.dayOfWeek === dayOfWeek &&
                        conflict.period === entry.period
                );
                expect(hasConflict).toBe(false);
            }
        });

        it('should respect blackout periods', async () => {
            // Add a blackout period
            const blackoutConstraints: ScheduleConstraints = {
                ...mockConstraints,
                blackoutPeriods: [
                    { 
                        date: startDate,
                        period: 3 as Period
                    }
                ]
            };

            const blackoutScheduler = new SchedulerService(startDate, blackoutConstraints);
            await blackoutScheduler.initialize(testClasses);
            
            const sortedClasses = blackoutScheduler.sortClassesByConstraints(testClasses);
            const success = await blackoutScheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = blackoutScheduler.getSchedule();

            // Check that no class is scheduled during blackout periods
            for (const entry of schedule) {
                const isBlackout = blackoutConstraints.blackoutPeriods.some(
                    blackout =>
                        blackout.date.getTime() === entry.assignedDate.getTime() &&
                        blackout.period === entry.period
                );
                expect(isBlackout).toBe(false);
            }
        });

        // Edge Cases
        it('should handle empty class list', async () => {
            const emptyScheduler = new SchedulerService(startDate, mockConstraints);
            await emptyScheduler.initialize([]);
            const success = await emptyScheduler.scheduleWithBacktracking([], startDate);
            expect(success).toBe(true);
            expect(emptyScheduler.getSchedule()).toHaveLength(0);
        });

        it('should handle classes with no available periods', async () => {
            const impossibleClass: Class = {
                id: 'impossible',
                classNumber: 'IMP-101',
                grade: '1' as GradeLevel,
                defaultConflicts: Array.from({ length: 5 }, (_, i) => 
                    Array.from({ length: 8 }, (_, j) => ({
                        dayOfWeek: (i + 1) as DayOfWeek,
                        period: (j + 1) as Period
                    }))
                ).flat(),
                active: true
            };

            const impossibleScheduler = new SchedulerService(startDate, mockConstraints);
            await impossibleScheduler.initialize([impossibleClass]);
            const success = await impossibleScheduler.scheduleWithBacktracking([impossibleClass], startDate);
            expect(success).toBe(false);
        });

        it('should handle classes with overlapping conflicts', async () => {
            const overlappingClass1: Class = {
                id: 'overlap1',
                classNumber: 'OVR-101',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            };

            const overlappingClass2: Class = {
                id: 'overlap2',
                classNumber: 'OVR-102',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            };

            const overlapScheduler = new SchedulerService(startDate, mockConstraints);
            await overlapScheduler.initialize([overlappingClass1, overlappingClass2]);
            const success = await overlapScheduler.scheduleWithBacktracking([overlappingClass1, overlappingClass2], startDate);
            expect(success).toBe(true);
            const schedule = overlapScheduler.getSchedule();
            expect(schedule).toHaveLength(2);

            // Check that the classes are not scheduled in their conflict periods
            for (const entry of schedule) {
                const date = entry.assignedDate;
                const dayOfWeek = date.getDay() as DayOfWeek;
                expect(dayOfWeek === 1 && (entry.period === 1 || entry.period === 2)).toBe(false);
            }
        });

        it('should respect maxConsecutivePeriods at day boundaries', async () => {
            const consecutiveConstraints: ScheduleConstraints = {
                ...mockConstraints,
                maxConsecutivePeriods: 2,
                avoidConsecutivePeriods: false
            };

            const consecutiveScheduler = new SchedulerService(startDate, consecutiveConstraints);
            await consecutiveScheduler.initialize(testClasses);
            const success = await consecutiveScheduler.scheduleWithBacktracking(testClasses, startDate);
            expect(success).toBe(true);
            const schedule = consecutiveScheduler.getSchedule();

            // Group periods by day
            const periodsByDay = new Map<string, Period[]>();
            for (const entry of schedule) {
                const dayKey = entry.assignedDate.toISOString().split('T')[0];
                const periods = periodsByDay.get(dayKey) || [];
                periods.push(entry.period);
                periodsByDay.set(dayKey, periods.sort((a, b) => a - b));
            }

            // Check consecutive periods
            for (const periods of periodsByDay.values()) {
                let consecutiveCount = 1;
                for (let i = 1; i < periods.length; i++) {
                    if (periods[i] === periods[i - 1] + 1) {
                        consecutiveCount++;
                        expect(consecutiveCount).toBeLessThanOrEqual(consecutiveConstraints.maxConsecutivePeriods);
                    } else {
                        consecutiveCount = 1;
                    }
                }
            }
        });
    });

    describe('Real World Data Tests', () => {
        const realWorldClasses: Class[] = [
            // First grade classes
            {
                id: '1-407',
                classNumber: '1-407',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 7 as Period }
                ],
                active: true
            },
            {
                id: '1-408',
                classNumber: '1-408',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            },
            {
                id: '1-409',
                classNumber: '1-409',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 4 as Period }
                ],
                active: true
            },
            {
                id: '1-410',
                classNumber: '1-410',
                grade: '1' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            // Second grade classes
            {
                id: '2-411',
                classNumber: '2-411',
                grade: '2' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            },
            // Second grade classes continued
            {
                id: '2-412',
                classNumber: '2-412',
                grade: '2' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 6 as Period }
                ],
                active: true
            },
            {
                id: '2-413',
                classNumber: '2-413',
                grade: '2' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 6 as Period }
                ],
                active: true
            },
            {
                id: '2-414',
                classNumber: '2-414',
                grade: '2' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 4 as Period }
                ],
                active: true
            },
            // Third grade classes
            {
                id: '3-415',
                classNumber: '3-415',
                grade: '3' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 7 as Period }
                ],
                active: true
            },
            {
                id: '3-416',
                classNumber: '3-416',
                grade: '3' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 1 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 3 as Period }
                ],
                active: true
            },
            // Third grade classes continued
            {
                id: '3-418',
                classNumber: '3-418',
                grade: '3' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 8 as Period }
                ],
                active: true
            },
            {
                id: '3-419',
                classNumber: '3-419',
                grade: '3' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 5 as Period }
                ],
                active: true
            },
            {
                id: '3-420',
                classNumber: '3-420',
                grade: '3' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            },
            // Multi-grade class
            {
                id: '3/4/5-518',
                classNumber: '3/4/5-518',
                grade: 'multiple' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            // Fourth grade classes
            {
                id: '4-508',
                classNumber: '4-508',
                grade: '4' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            // Fourth grade classes continued
            {
                id: '4-509',
                classNumber: '4-509',
                grade: '4' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            {
                id: '4-510',
                classNumber: '4-510',
                grade: '4' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            {
                id: '4-515',
                classNumber: '4-515',
                grade: '4' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 6 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            // Fifth grade classes continued
            {
                id: '5-513',
                classNumber: '5-513',
                grade: '5' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 8 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 8 as Period }
                ],
                active: true
            },
            {
                id: '5-514',
                classNumber: '5-514',
                grade: '5' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 7 as Period }
                ],
                active: true
            },
            // Kindergarten classes
            {
                id: 'K-309',
                classNumber: 'K-309',
                grade: 'K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period }
                ],
                active: true
            },
            {
                id: 'K-310',
                classNumber: 'K-310',
                grade: 'K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            },
            {
                id: 'K-311',
                classNumber: 'K-311',
                grade: 'K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 3 as Period }
                ],
                active: true
            },
            // Kindergarten classes continued
            {
                id: 'K-312',
                classNumber: 'K-312',
                grade: 'K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 3 as Period }
                ],
                active: true
            },
            {
                id: 'K-313',
                classNumber: 'K-313',
                grade: 'K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 8 as Period }
                ],
                active: true
            },
            // Multi-grade class
            {
                id: 'K/1/2-417',
                classNumber: 'K/1/2-417',
                grade: 'multiple' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 2 as Period }
                ],
                active: true
            },
            // Pre-K classes
            {
                id: 'PK207',
                classNumber: 'PK207',
                grade: 'Pre-K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 4 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 1 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 3 as Period }
                ],
                active: true
            },
            {
                id: 'PK208',
                classNumber: 'PK208',
                grade: 'Pre-K' as GradeLevel,
                defaultConflicts: [
                    { dayOfWeek: 1 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 1 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 2 as DayOfWeek, period: 7 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 3 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 2 as Period },
                    { dayOfWeek: 4 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 3 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 5 as Period },
                    { dayOfWeek: 5 as DayOfWeek, period: 7 as Period }
                ],
                active: true
            }
        ];

        it('should successfully schedule real-world classes', async () => {
            const realWorldConstraints: ScheduleConstraints = {
                maxPeriodsPerDay: 8,
                maxPeriodsPerWeek: 40,
                blackoutPeriods: [],
                avoidConsecutivePeriods: false,
                maxConsecutivePeriods: 8
            };

            const startDate = new Date('2024-09-03'); // First Tuesday of September 2024
            const scheduler = new SchedulerService(startDate, realWorldConstraints);
            await scheduler.initialize(realWorldClasses);
            
            const sortedClasses = scheduler.sortClassesByConstraints(realWorldClasses);
            const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
            
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();
            
            // Verify that all classes are scheduled
            expect(schedule.length).toBe(realWorldClasses.length);
            
            // Verify that no class is scheduled during its conflict periods
            for (const entry of schedule) {
                const classDoc = realWorldClasses.find(c => c.id === entry.classId);
                const date = entry.assignedDate;
                const dayOfWeek = (date.getDay() as DayOfWeek);
                
                const hasConflict = classDoc?.defaultConflicts.some(
                    conflict => 
                        conflict.dayOfWeek === dayOfWeek &&
                        conflict.period === entry.period
                );
                expect(hasConflict).toBe(false);
            }
            
            // Log schedule statistics
            const classesPerDay = new Map<string, number>();
            for (const entry of schedule) {
                const dayKey = entry.assignedDate.toISOString().split('T')[0];
                classesPerDay.set(dayKey, (classesPerDay.get(dayKey) || 0) + 1);
            }
            
            console.log('Real World Schedule Statistics:');
            console.log('Total Classes Scheduled:', schedule.length);
            console.log('Classes per Day:', Object.fromEntries(classesPerDay));
        });
    });
}); 