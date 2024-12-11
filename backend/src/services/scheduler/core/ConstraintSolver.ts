import { ScheduleGraph, TimeSlot } from './types/Graph';
import {
    BasicScheduleConstraints,
    ScheduledClass,
    ConstraintViolation,
    ConstraintValidationResult,
    BlackoutPeriod
} from './types/Constraints';

export class ConstraintSolver {
    constructor(
        private basicConstraints: BasicScheduleConstraints,
        private classes: ScheduledClass[]
    ) {}

    public applyConstraints(graph: ScheduleGraph, scheduleStartDate: Date): ConstraintValidationResult {
        const violations: ConstraintViolation[] = [];

        // Validate basic constraints
        violations.push(...this.validateBasicConstraints(graph, scheduleStartDate));
        
        // Validate blocked periods for each class
        violations.push(...this.validateBlockedPeriods(graph));

        return {
            isValid: violations.length === 0,
            violations
        };
    }

    private validateBasicConstraints(graph: ScheduleGraph, scheduleStartDate: Date): ConstraintViolation[] {
        const violations: ConstraintViolation[] = [];

        // Check maximum periods per day
        const periodsPerDay = new Map<number, string[]>();
        for (const [classId, timeSlot] of graph.colors) {
            const dayClasses = periodsPerDay.get(timeSlot.dayOfWeek) || [];
            dayClasses.push(classId);
            periodsPerDay.set(timeSlot.dayOfWeek, dayClasses);

            if (dayClasses.length > this.basicConstraints.maxPeriodsPerDay) {
                violations.push({
                    type: 'max_periods',
                    classIds: dayClasses,
                    message: `Day ${timeSlot.dayOfWeek} exceeds maximum periods (${this.basicConstraints.maxPeriodsPerDay})`
                });
            }
        }

        // Check consecutive periods
        if (this.basicConstraints.avoidConsecutivePeriods) {
            for (const [classId, timeSlot] of graph.colors) {
                const node = graph.vertices.get(classId);
                if (!node) continue;

                for (const adjId of node.adjacentNodes) {
                    const adjSlot = graph.colors.get(adjId);
                    if (!adjSlot) continue;

                    if (timeSlot.dayOfWeek === adjSlot.dayOfWeek && 
                        Math.abs(timeSlot.period - adjSlot.period) === 1) {
                        violations.push({
                            type: 'consecutive_periods',
                            classIds: [classId, adjId],
                            message: `Classes ${classId} and ${adjId} are scheduled consecutively`
                        });
                    }
                }
            }
        }

        // Check blackout periods
        for (const [classId, timeSlot] of graph.colors) {
            // Calculate the actual date for this time slot
            const slotDate = new Date(scheduleStartDate);
            slotDate.setDate(slotDate.getDate() + (timeSlot.dayOfWeek - 1));

            const isBlackout = this.basicConstraints.blackoutPeriods.some(blackout => {
                // Check if dates match (ignoring time)
                const blackoutDate = new Date(blackout.date);
                const datesMatch = 
                    slotDate.getFullYear() === blackoutDate.getFullYear() &&
                    slotDate.getMonth() === blackoutDate.getMonth() &&
                    slotDate.getDate() === blackoutDate.getDate();

                if (!datesMatch) return false;

                // Check if period is blocked
                return blackout.allDay || 
                       (blackout.periods && blackout.periods.includes(timeSlot.period));
            });

            if (isBlackout) {
                violations.push({
                    type: 'blackout_period',
                    classIds: [classId],
                    message: `Class ${classId} scheduled during blackout period`
                });
            }
        }

        return violations;
    }

    private validateBlockedPeriods(graph: ScheduleGraph): ConstraintViolation[] {
        const violations: ConstraintViolation[] = [];

        for (const [classId, timeSlot] of graph.colors) {
            const classInfo = this.classes.find(c => c.id === classId);
            if (!classInfo) continue;

            const isBlocked = classInfo.blockedPeriods.some(
                blocked => 
                    blocked.dayOfWeek === timeSlot.dayOfWeek && 
                    blocked.period === timeSlot.period
            );

            if (isBlocked) {
                violations.push({
                    type: 'blocked_period',
                    classIds: [classId],
                    message: `Class ${classId} scheduled during its blocked period`
                });
            }
        }

        return violations;
    }

    public findAvailableSlot(
        classId: string,
        graph: ScheduleGraph,
        scheduleStartDate: Date,
        preferredSlots?: TimeSlot[]
    ): TimeSlot | null {
        const node = graph.vertices.get(classId);
        if (!node) return null;

        const usedSlots = new Set<string>();

        // Get adjacent vertices' colors
        for (const adjId of node.adjacentNodes) {
            const adjSlot = graph.colors.get(adjId);
            if (adjSlot) {
                usedSlots.add(`${adjSlot.dayOfWeek}-${adjSlot.period}`);
            }
        }

        // Get class info for blocked periods
        const classInfo = this.classes.find(c => c.id === classId);
        if (!classInfo) return null;

        // First try preferred slots if provided
        if (preferredSlots?.length) {
            for (const slot of preferredSlots) {
                if (this.isSlotAvailable(slot, usedSlots, classInfo, scheduleStartDate)) {
                    return slot;
                }
            }
        }

        // Try all possible slots
        for (let day = 1; day <= 5; day++) {
            for (let period = 1; period <= this.basicConstraints.maxPeriodsPerDay; period++) {
                const slot = { dayOfWeek: day, period };
                if (this.isSlotAvailable(slot, usedSlots, classInfo, scheduleStartDate)) {
                    return slot;
                }
            }
        }

        return null;
    }

    private isSlotAvailable(
        slot: TimeSlot,
        usedSlots: Set<string>,
        classInfo: ScheduledClass,
        scheduleStartDate: Date
    ): boolean {
        const slotKey = `${slot.dayOfWeek}-${slot.period}`;
        
        // Check if slot is already used
        if (usedSlots.has(slotKey)) return false;

        // Check if slot is in class's blocked periods
        const isBlocked = classInfo.blockedPeriods.some(
            blocked => 
                blocked.dayOfWeek === slot.dayOfWeek && 
                blocked.period === slot.period
        );
        if (isBlocked) return false;

        // Check if slot is in blackout period
        const slotDate = new Date(scheduleStartDate);
        slotDate.setDate(slotDate.getDate() + (slot.dayOfWeek - 1));

        const isBlackout = this.basicConstraints.blackoutPeriods.some(blackout => {
            const blackoutDate = new Date(blackout.date);
            const datesMatch = 
                slotDate.getFullYear() === blackoutDate.getFullYear() &&
                slotDate.getMonth() === blackoutDate.getMonth() &&
                slotDate.getDate() === blackoutDate.getDate();

            if (!datesMatch) return false;

            return blackout.allDay || 
                   (blackout.periods && blackout.periods.includes(slot.period));
        });

        return !isBlackout;
    }
} 