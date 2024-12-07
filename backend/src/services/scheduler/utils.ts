import { ScheduledClass } from './types';

export function evaluateDistribution(classes: ScheduledClass[]): number {
    if (classes.length === 0) return 0;

    // Count classes per day
    const classesPerDay = Array(5).fill(0);
    classes.forEach(cls => {
        classesPerDay[cls.dayOfWeek] = (classesPerDay[cls.dayOfWeek] || 0) + 1;
    });

    // Calculate standard deviation
    const mean = classesPerDay.reduce((a, b) => a + b, 0) / 5;
    const variance = classesPerDay.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / 5;
    const stdDev = Math.sqrt(variance);

    // Score from 0 to 1, where lower std dev is better
    return Math.max(0, 1 - (stdDev / mean));
}

export function evaluateTimeGaps(classes: ScheduledClass[]): number {
    if (classes.length <= 1) return 1;

    // Sort classes by day and time
    const sortedClasses = [...classes].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.getTime() - b.startTime.getTime();
    });

    let totalGaps = 0;
    let gapCount = 0;

    // Calculate gaps between classes on the same day
    for (let i = 1; i < sortedClasses.length; i++) {
        const current = sortedClasses[i];
        const previous = sortedClasses[i - 1];

        if (current.dayOfWeek === previous.dayOfWeek) {
            const gap = (current.startTime.getTime() - previous.endTime.getTime()) / (1000 * 60); // gap in minutes
            totalGaps += gap;
            gapCount++;
        }
    }

    // Score based on average gap length (assuming ideal gap is 15-30 minutes)
    const avgGap = gapCount > 0 ? totalGaps / gapCount : 0;
    return Math.max(0, 1 - Math.abs(avgGap - 20) / 60);
}

export function evaluatePeriodUtilization(classes: ScheduledClass[]): number {
    if (classes.length === 0) return 0;

    // Define time periods (assuming 8am-4pm school day)
    const morning = 8;
    const afternoon = 13;

    let morningClasses = 0;
    let afternoonClasses = 0;

    classes.forEach(cls => {
        const hour = cls.startTime.getHours();
        if (hour < morning) return;
        if (hour < afternoon) {
            morningClasses++;
        } else {
            afternoonClasses++;
        }
    });

    // Calculate balance ratio (ideal is 50/50 split)
    const total = morningClasses + afternoonClasses;
    const ratio = morningClasses / total;
    return 1 - Math.abs(0.5 - ratio);
} 