import { ConstraintSolver } from '../ConstraintSolver';
import { ScheduleGraph, TimeSlot } from '../types/Graph';
import { BasicScheduleConstraints, ScheduledClass, BlackoutPeriod } from '../types/Constraints';

describe('ConstraintSolver - Blackout Period Tests', () => {
    let baseConstraints: BasicScheduleConstraints;
    let classes: ScheduledClass[];
    let graph: ScheduleGraph;
    let solver: ConstraintSolver;
    let scheduleStartDate: Date;

    beforeEach(() => {
        // Set up base constraints
        baseConstraints = {
            maxPeriodsPerDay: 8,
            maxPeriodsPerWeek: 40,
            maxConsecutivePeriods: 3,
            avoidConsecutivePeriods: false,
            blackoutPeriods: []
        };

        // Set up test classes
        classes = [
            {
                id: 'class1',
                name: 'Test Class 1',
                blockedPeriods: []
            },
            {
                id: 'class2',
                name: 'Test Class 2',
                blockedPeriods: []
            }
        ];

        // Set up a simple graph with two classes
        graph = {
            vertices: new Map([
                ['class1', {
                    id: 'class1',
                    name: 'Test Class 1',
                    constraints: new Set<string>(),
                    saturationDegree: 0,
                    adjacentNodes: new Set(['class2'])
                }],
                ['class2', {
                    id: 'class2',
                    name: 'Test Class 2',
                    constraints: new Set<string>(),
                    saturationDegree: 0,
                    adjacentNodes: new Set(['class1'])
                }]
            ]),
            edges: new Map([
                ['class1', new Set(['class2'])],
                ['class2', new Set(['class1'])]
            ]),
            colors: new Map([
                ['class1', { dayOfWeek: 1, period: 1 }], // Monday, first period
                ['class2', { dayOfWeek: 1, period: 3 }]  // Monday, third period
            ])
        };

        // Set schedule start date to a Monday
        scheduleStartDate = new Date('2024-01-15'); // A Monday
        solver = new ConstraintSolver(baseConstraints, classes);
    });

    describe('Single Day Blackouts', () => {
        test('should detect full day blackout violation', () => {
            // Add a full day blackout for Monday
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                allDay: true
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(2);
            expect(result.violations[0].type).toBe('blackout_period');
            expect(result.violations[0].classIds).toContain('class1');
            expect(result.violations[1].classIds).toContain('class2');
        });

        test('should detect specific period blackout violation', () => {
            // Add a blackout for Monday's first period only
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                periods: [1]
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].type).toBe('blackout_period');
            expect(result.violations[0].classIds).toContain('class1');
            expect(result.violations[0].classIds).not.toContain('class2');
        });

        test('should pass when no blackout periods are violated', () => {
            // Add a blackout for a different day
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-16'), // Tuesday
                allDay: true
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            
            expect(result.isValid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });
    });

    describe('Multiple Week Scenarios', () => {
        test('should handle blackouts across multiple weeks', () => {
            // Add blackouts for consecutive Mondays
            baseConstraints.blackoutPeriods = [
                {
                    date: new Date('2024-01-15'),
                    periods: [1, 2]
                },
                {
                    date: new Date('2024-01-22'),
                    allDay: true
                }
            ];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].classIds).toContain('class1');
        });

        test('should validate against multiple partial day blackouts', () => {
            // Add multiple partial day blackouts
            baseConstraints.blackoutPeriods = [
                {
                    date: new Date('2024-01-15'),
                    periods: [1, 2, 3]
                },
                {
                    date: new Date('2024-01-17'),
                    periods: [4, 5, 6]
                }
            ];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(2);
        });
    });

    describe('Slot Availability Tests', () => {
        test('should find available slot outside blackout periods', () => {
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                periods: [1, 2, 3]
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const availableSlot = solver.findAvailableSlot('class1', graph, scheduleStartDate);
            
            expect(availableSlot).not.toBeNull();
            if (availableSlot) {
                expect(availableSlot.dayOfWeek).toBe(1);
                expect(availableSlot.period).toBeGreaterThan(3);
            }
        });

        test('should handle complex blackout patterns', () => {
            baseConstraints.blackoutPeriods = [
                {
                    date: new Date('2024-01-15'),
                    periods: [1, 2, 3, 4]
                },
                {
                    date: new Date('2024-01-16'),
                    allDay: true
                },
                {
                    date: new Date('2024-01-17'),
                    periods: [5, 6, 7, 8]
                }
            ];
            solver = new ConstraintSolver(baseConstraints, classes);

            const availableSlot = solver.findAvailableSlot('class1', graph, scheduleStartDate);
            
            expect(availableSlot).not.toBeNull();
            if (availableSlot) {
                // Should find a slot on Monday afternoon or Wednesday morning
                expect(
                    (availableSlot.dayOfWeek === 1 && availableSlot.period > 4) ||
                    (availableSlot.dayOfWeek === 3 && availableSlot.period < 5)
                ).toBe(true);
            }
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        test('should handle empty periods array in blackout', () => {
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                periods: []
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            expect(result.isValid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        test('should handle blackout period at schedule boundaries', () => {
            // Test blackout at the very start of schedule
            baseConstraints.blackoutPeriods = [{
                date: scheduleStartDate,
                periods: [1]
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(1);
        });

        test('should handle overlapping blackout periods', () => {
            baseConstraints.blackoutPeriods = [
                {
                    date: new Date('2024-01-15'),
                    periods: [1, 2, 3]
                },
                {
                    date: new Date('2024-01-15'),
                    periods: [2, 3, 4]
                }
            ];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(2);  // Both classes violate the overlapping blackouts
            expect(result.violations[0].classIds).toContain('class1');
            expect(result.violations[1].classIds).toContain('class2');
            
            // Verify that both violations are of type blackout_period
            expect(result.violations.every(v => v.type === 'blackout_period')).toBe(true);
        });

        test('should handle blackout period with both allDay and specific periods', () => {
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                allDay: true,
                periods: [1, 2, 3]  // allDay should take precedence
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            expect(result.isValid).toBe(false);
            expect(result.violations).toHaveLength(2);
        });

        test('should handle invalid period numbers', () => {
            baseConstraints.blackoutPeriods = [{
                date: new Date('2024-01-15'),
                periods: [0, 9, -1]  // Invalid period numbers
            }];
            solver = new ConstraintSolver(baseConstraints, classes);

            const result = solver.applyConstraints(graph, scheduleStartDate);
            expect(result.isValid).toBe(true);  // Invalid periods should be ignored
            expect(result.violations).toHaveLength(0);
        });
    });
}); 