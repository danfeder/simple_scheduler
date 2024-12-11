import { GraphColoringService } from '../GraphColoringService';
import { ScheduledClass, ScheduleConstraints } from '../../types';

describe('GraphColoringService', () => {
    const defaultConstraints: ScheduleConstraints = {
        maxPeriodsPerDay: 6,
        maxPeriodsPerWeek: 30,
        maxConsecutivePeriods: 3,
        avoidConsecutivePeriods: false,
        blackoutPeriods: []
    };

    const mockClasses: ScheduledClass[] = [
        {
            id: 'class1',
            name: 'Math 101',
            startTime: new Date(),
            endTime: new Date(),
            dayOfWeek: 1,
            period: 1,
            conflicts: [
                { dayOfWeek: 1, period: 2 }, // class2
                { dayOfWeek: 2, period: 1 }  // class3
            ]
        },
        {
            id: 'class2',
            name: 'Physics 101',
            startTime: new Date(),
            endTime: new Date(),
            dayOfWeek: 1,
            period: 2,
            conflicts: [
                { dayOfWeek: 1, period: 1 }  // class1
            ]
        },
        {
            id: 'class3',
            name: 'Chemistry 101',
            startTime: new Date(),
            endTime: new Date(),
            dayOfWeek: 2,
            period: 1,
            conflicts: [
                { dayOfWeek: 1, period: 1 }  // class1
            ]
        }
    ];

    let service: GraphColoringService;

    beforeEach(() => {
        service = new GraphColoringService(defaultConstraints);
    });

    describe('buildGraph', () => {
        it('should create correct graph structure', () => {
            const graph = service.buildGraph(mockClasses);

            // Check vertices
            expect(graph.vertices.size).toBe(3);
            expect(graph.vertices.get('class1')).toBeDefined();
            expect(graph.vertices.get('class2')).toBeDefined();
            expect(graph.vertices.get('class3')).toBeDefined();

            // Check edges based on time conflicts
            const class1Edges = graph.edges.get('class1');
            expect(class1Edges?.has('class2')).toBe(true);
            expect(class1Edges?.has('class3')).toBe(true);
            
            const class2Edges = graph.edges.get('class2');
            expect(class2Edges?.has('class1')).toBe(true);
            
            const class3Edges = graph.edges.get('class3');
            expect(class3Edges?.has('class1')).toBe(true);
        });
    });

    describe('colorGraph', () => {
        it('should color graph without conflicts', () => {
            const graph = service.buildGraph(mockClasses);
            const result = service.colorGraph(graph);

            expect(result.success).toBe(true);
            expect(result.schedule).toBeDefined();

            if (result.schedule) {
                const class1Slot = result.schedule.get('class1');
                const class2Slot = result.schedule.get('class2');
                const class3Slot = result.schedule.get('class3');

                // Check that conflicting classes have different time slots
                expect(class1Slot).toBeDefined();
                expect(class2Slot).toBeDefined();
                expect(class3Slot).toBeDefined();

                if (class1Slot && class2Slot) {
                    expect(
                        class1Slot.dayOfWeek !== class2Slot.dayOfWeek ||
                        class1Slot.period !== class2Slot.period
                    ).toBe(true);
                }

                if (class1Slot && class3Slot) {
                    expect(
                        class1Slot.dayOfWeek !== class3Slot.dayOfWeek ||
                        class1Slot.period !== class3Slot.period
                    ).toBe(true);
                }
            }
        });

        it('should handle highly constrained graphs', () => {
            const constrainedClasses: ScheduledClass[] = [
                ...mockClasses,
                {
                    id: 'class4',
                    name: 'Biology 101',
                    startTime: new Date(),
                    endTime: new Date(),
                    dayOfWeek: 1,
                    period: 1,
                    conflicts: [
                        { dayOfWeek: 1, period: 1 }, // class1
                        { dayOfWeek: 1, period: 2 }, // class2
                        { dayOfWeek: 2, period: 1 }  // class3
                    ]
                }
            ];

            const graph = service.buildGraph(constrainedClasses);
            const result = service.colorGraph(graph);

            expect(result.success).toBe(true);
            expect(result.schedule).toBeDefined();

            if (result.schedule) {
                // Verify no conflicts in coloring
                const colorings = Array.from(result.schedule.entries());
                for (let i = 0; i < colorings.length; i++) {
                    for (let j = i + 1; j < colorings.length; j++) {
                        const [id1, slot1] = colorings[i];
                        const [id2, slot2] = colorings[j];
                        
                        const sourceClass = constrainedClasses.find(c => c.id === id1);
                        const hasConflict = sourceClass?.conflicts?.some(
                            conflict => 
                                conflict.dayOfWeek === slot2.dayOfWeek && 
                                conflict.period === slot2.period
                        );

                        if (hasConflict) {
                            expect(
                                slot1.dayOfWeek !== slot2.dayOfWeek ||
                                slot1.period !== slot2.period
                            ).toBe(true);
                        }
                    }
                }
            }
        });
    });

    describe('validateColoring', () => {
        it('should detect conflicts in coloring', () => {
            const graph = service.buildGraph(mockClasses);
            const result = service.colorGraph(graph);

            expect(result.success).toBe(true);
            if (result.schedule) {
                graph.colors = result.schedule;
                const validation = service.validateColoring(graph);
                expect(validation.isValid).toBe(true);
                expect(validation.conflicts).toHaveLength(0);
            }
        });

        it('should report conflicts when present', () => {
            const graph = service.buildGraph(mockClasses);
            // Deliberately create a conflict
            graph.colors = new Map([
                ['class1', { dayOfWeek: 1, period: 1 }],
                ['class2', { dayOfWeek: 1, period: 1 }], // Same slot as class1
                ['class3', { dayOfWeek: 2, period: 1 }]
            ]);

            const validation = service.validateColoring(graph);
            expect(validation.isValid).toBe(false);
            expect(validation.conflicts.length).toBeGreaterThan(0);
        });
    });
}); 