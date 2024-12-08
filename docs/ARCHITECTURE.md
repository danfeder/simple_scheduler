# Technical Architecture

## Overview

The School Class Scheduler is built using a modern TypeScript stack with clear separation of concerns and strong type safety. The system uses an enhanced backtracking algorithm with state restoration for efficient schedule generation.

## Core Architecture

### Type System

```typescript
// Core Types (shared/types/index.ts)
type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple';
type DayOfWeek = 1 | 2 | 3 | 4 | 5; // Monday = 1, Friday = 5
type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Class {
  id?: string;
  classNumber: string;
  grade: GradeLevel;
  defaultConflicts: Conflict[];
  active: boolean;
}

interface ScheduleConstraints {
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  blackoutPeriods: BlackoutPeriod[];
  avoidConsecutivePeriods: boolean;
  maxConsecutivePeriods: number;
}

interface BacktrackingState {
  classIndex: number;
  schedule: ScheduleEntry[];
  scheduledPeriodsToday: Map<string, number>;
  scheduledPeriodsThisWeek: Map<string, number>;
}
```

### Scheduling Algorithm

The scheduler uses an enhanced backtracking algorithm with the following components:

#### State Management
```typescript
class SchedulerService {
  private schedule: ScheduleEntry[] = [];
  private backtrackingStack: BacktrackingState[] = [];
  
  private saveBacktrackingState(
    classIndex: number,
    schedule: ScheduleEntry[],
    scheduledPeriodsToday: Map<string, number>,
    scheduledPeriodsThisWeek: Map<string, number>
  ): BacktrackingState {
    return {
      classIndex,
      schedule: [...schedule],
      scheduledPeriodsToday: new Map(scheduledPeriodsToday),
      scheduledPeriodsThisWeek: new Map(scheduledPeriodsThisWeek)
    };
  }
}
```

#### Constraint Validation
```typescript
class SchedulerService {
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

    // Check consecutive periods constraint
    if (this.constraints.avoidConsecutivePeriods) {
      const hasAdjacentPeriod = this.schedule.some(entry => {
        if (entry.assignedDate.getTime() !== date.getTime()) return false;
        return Math.abs(entry.period - period) === 1;
      });
      if (hasAdjacentPeriod) return false;
    }

    // Additional constraint checks...
    return true;
  }
}
```

#### Performance Optimization
```typescript
class SchedulerService {
  public sortClassesByConstraints(classes: Class[]): Class[] {
    return [...classes].sort((a, b) => 
      (b.defaultConflicts?.length || 0) - (a.defaultConflicts?.length || 0)
    );
  }
}
```

## Testing Architecture

### Unit Tests
```typescript
describe('SchedulerService', () => {
  describe('Edge Cases', () => {
    it('should handle empty class list', async () => {
      const scheduler = new SchedulerService(startDate, constraints);
      const success = await scheduler.scheduleWithBacktracking([], startDate);
      expect(success).toBe(true);
      expect(scheduler.getSchedule()).toHaveLength(0);
    });

    it('should handle classes with no available periods', async () => {
      const impossibleClass = createImpossibleClass();
      const success = await scheduler.scheduleWithBacktracking([impossibleClass], startDate);
      expect(success).toBe(false);
    });
  });

  describe('Real World Data', () => {
    it('should successfully schedule real-world classes', async () => {
      const realWorldClasses = loadRealWorldClasses();
      const success = await scheduler.scheduleWithBacktracking(realWorldClasses, startDate);
      expect(success).toBe(true);
      validateSchedule(scheduler.getSchedule(), realWorldClasses);
    });
  });
});
```

## Performance Characteristics

### Time Complexity
- Best Case: O(n) when no backtracking needed
- Average Case: O(n log n) with sorting and minimal backtracking
- Worst Case: O(n²) with maximum backtracking

### Space Complexity
- O(n) for schedule storage
- O(n) for backtracking stack
- O(1) for daily/weekly counters

### Scaling Analysis
- Small datasets (≤100 classes): Linear scaling
- Medium datasets (100-500 classes): Near-quadratic scaling
- Large datasets (500-2000 classes): Efficient sub-quadratic scaling

## Future Optimizations

### Planned Improvements
1. Intelligent state selection for backtracking
2. Conflict prediction for early pruning
3. Dynamic constraint relaxation
4. Schedule quality metrics
5. Teacher and room constraint handling

### Performance Targets
- Support for 5000+ classes
- Sub-second scheduling for typical loads
- Real-time constraint updates
- Efficient memory usage for large datasets