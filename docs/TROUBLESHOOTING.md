# Scheduler Troubleshooting Guide

## Common Issues and Solutions

### 1. Schedule Generation Failures

#### No Solution Found
**Symptoms:**
- `scheduleWithBacktracking` returns `false`
- No schedule entries generated
- Maximum backtracks reached

**Possible Causes:**
1. Over-constrained system
   - Too many conflicts per class
   - Too restrictive period limits
   - Incompatible blackout periods

2. Insufficient scheduling slots
   - More classes than available periods
   - Uneven distribution requirements

**Solutions:**
```typescript
// 1. Increase backtracking limit
const success = await scheduler.scheduleWithBacktracking(
    classes,
    startDate,
    2000  // Increase from default 1000
);

// 2. Adjust constraints
const relaxedConstraints: ScheduleConstraints = {
    ...constraints,
    maxPeriodsPerDay: constraints.maxPeriodsPerDay + 1,
    avoidConsecutivePeriods: false
};

// 3. Sort classes by complexity first
const sortedClasses = scheduler.sortClassesByConstraints(classes);
```

### 2. Performance Issues

#### Slow Schedule Generation
**Symptoms:**
- Long processing times
- High memory usage
- Excessive backtracking

**Solutions:**
```typescript
// 1. Pre-sort classes by constraint complexity
const sortedClasses = classes.sort((a, b) => 
    (b.defaultConflicts?.length || 0) - (a.defaultConflicts?.length || 0)
);

// 2. Implement early termination
if (backtracks >= maxBacktracks) {
    this.schedule = [];
    return false;
}

// 3. Use efficient data structures
const scheduledPeriodsToday = new Map<string, number>();
const scheduledPeriodsThisWeek = new Map<string, number>();
```

#### Memory Leaks
**Symptoms:**
- Growing memory usage
- Slow performance over time
- Out of memory errors

**Solutions:**
```typescript
// 1. Clear state after failed attempts
private clearState(): void {
    this.schedule = [];
    this.backtrackingStack = [];
}

// 2. Limit backtracking stack size
if (this.backtrackingStack.length > maxStackSize) {
    this.backtrackingStack = this.backtrackingStack.slice(-maxStackSize);
}
```

### 3. Constraint Violations

#### Period Limit Violations
**Symptoms:**
- Classes scheduled beyond daily/weekly limits
- Consecutive period rules ignored

**Solutions:**
```typescript
// 1. Add comprehensive constraint checking
private meetsConstraints(
    classDoc: Class,
    date: Date,
    period: Period,
    scheduledPeriodsToday: Map<string, number>,
    scheduledPeriodsThisWeek: Map<string, number>
): boolean {
    // Check daily and weekly limits per class
    if (periodsToday >= this.constraints.maxPeriodsPerDay) return false;
    if (periodsThisWeek >= this.constraints.maxPeriodsPerWeek) return false;

    // Check total periods per day across all classes
    const totalPeriodsToday = Array.from(scheduledPeriodsToday.values())
        .reduce((sum, count) => sum + count, 0);
    if (totalPeriodsToday >= this.constraints.maxPeriodsPerDay) return false;

    return true;
}

// 2. Validate schedule after generation
private validateSchedule(schedule: ScheduleEntry[]): boolean {
    const periodsPerDay = new Map<string, number>();
    for (const entry of schedule) {
        const dayKey = entry.assignedDate.toISOString().split('T')[0];
        const count = (periodsPerDay.get(dayKey) || 0) + 1;
        if (count > this.constraints.maxPeriodsPerDay) return false;
        periodsPerDay.set(dayKey, count);
    }
    return true;
}
```

#### Conflict Resolution Issues
**Symptoms:**
- Classes scheduled during blackout periods
- Overlapping class assignments
- Conflict constraints ignored

**Solutions:**
```typescript
// 1. Implement comprehensive conflict checking
private hasConflict(
    classDoc: Class,
    date: Date,
    period: Period
): boolean {
    // Check blackout periods
    const isBlackout = this.constraints.blackoutPeriods?.some(
        blackout =>
            blackout.date.getTime() === date.getTime() &&
            blackout.period === period
    );
    if (isBlackout) return true;

    // Check class-specific conflicts
    const dayOfWeek = (date.getDay() as DayOfWeek);
    return classDoc.defaultConflicts?.some(
        conflict => 
            conflict.dayOfWeek === dayOfWeek &&
            conflict.period === period
    ) || false;
}

// 2. Add conflict validation to schedule
private validateConflicts(schedule: ScheduleEntry[]): boolean {
    const periodMap = new Map<string, Set<Period>>();
    for (const entry of schedule) {
        const dayKey = entry.assignedDate.toISOString();
        const periods = periodMap.get(dayKey) || new Set();
        if (periods.has(entry.period)) return false;
        periods.add(entry.period);
        periodMap.set(dayKey, periods);
    }
    return true;
}
```

### 4. Edge Cases

#### Multi-Grade Classes
**Symptoms:**
- Incorrect handling of multi-grade classes
- Missing or duplicate schedules
- Constraint violations

**Solutions:**
```typescript
// 1. Special handling for multi-grade classes
if (classDoc.grade === 'multiple') {
    // Apply stricter constraints
    const stricterConstraints = {
        ...this.constraints,
        maxPeriodsPerDay: Math.min(2, this.constraints.maxPeriodsPerDay),
        avoidConsecutivePeriods: true
    };
}

// 2. Priority scheduling for multi-grade classes
const sortedClasses = classes.sort((a, b) => {
    if (a.grade === 'multiple' && b.grade !== 'multiple') return -1;
    if (a.grade !== 'multiple' && b.grade === 'multiple') return 1;
    return (b.defaultConflicts?.length || 0) - (a.defaultConflicts?.length || 0);
});
```

## Debugging Tools

### 1. Schedule Analysis
```typescript
function analyzeSchedule(schedule: ScheduleEntry[]): ScheduleAnalysis {
    return {
        classesPerDay: countClassesPerDay(schedule),
        periodsUtilization: analyzePeriodsUtilization(schedule),
        conflictCount: findConflicts(schedule),
        constraintViolations: checkConstraints(schedule)
    };
}
```

### 2. Performance Monitoring
```typescript
interface PerformanceMetrics {
    sortingDurationMs: number;
    totalClassCount: number;
    averageTimePerClass: number;
    backtrackCount: number;
}

function measurePerformance(): PerformanceMetrics {
    const startTime = performance.now();
    // ... scheduling logic ...
    return {
        sortingDurationMs: performance.now() - startTime,
        totalClassCount: classes.length,
        averageTimePerClass: (performance.now() - startTime) / classes.length,
        backtrackCount
    };
}
```

### 3. State Inspection
```typescript
function inspectSchedulerState(): StateInspection {
    return {
        currentSchedule: this.schedule,
        backtrackingStackDepth: this.backtrackingStack.length,
        periodsPerDay: this.analyzePeriodsPerDay(),
        constraintSatisfaction: this.validateConstraints()
    };
}
```

## Best Practices

1. Always sort classes by constraint complexity before scheduling
2. Implement comprehensive validation before returning schedules
3. Use performance monitoring for large datasets
4. Handle edge cases explicitly
5. Maintain clean state between scheduling attempts
6. Log important metrics and state changes
7. Validate input data before processing