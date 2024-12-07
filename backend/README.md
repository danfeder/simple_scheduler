# School Schedule Generator Backend

## Overview
This document details the technical implementation of the scheduling system's backend. For general project information, setup instructions, and API documentation, please refer to the [main README](../README.md).

## Architecture

### Core Components

#### SchedulerService
The main scheduling service that implements the `ISchedulerService` interface. Key features:
- Backtracking-based scheduling algorithm with state restoration
- Comprehensive constraint validation
- Schedule optimization with sorting by constraint complexity
- Performance monitoring and scaling analysis

#### Key Types
```typescript
interface ScheduleConstraints {
    maxPeriodsPerDay: number;
    maxPeriodsPerWeek: number;
    blackoutPeriods: BlackoutPeriod[];
    avoidConsecutivePeriods: boolean;
    maxConsecutivePeriods: number;
}

interface ScheduleEntry {
    classId: string;
    assignedDate: Date;
    period: Period;
}

type GradeLevel = 'Pre-K' | 'K' | '1' | '2' | '3' | '4' | '5' | 'multiple';
type DayOfWeek = 1 | 2 | 3 | 4 | 5;  // Monday to Friday
type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
```

### Algorithm Details

#### Scheduling Algorithm
The scheduler uses an enhanced backtracking algorithm with the following key features:
1. Sorts classes by constraint complexity to handle difficult cases first
2. Maintains a stack of valid states for efficient backtracking
3. Attempts to schedule each class while maintaining all constraints
4. Backtracks with state restoration when conflicts are detected
5. Supports a configurable maximum number of backtracks (default: 1000)

#### Performance Characteristics
- Best Case: O(n) - When no backtracking is needed
- Average Case: O(n log n) - With sorting and minimal backtracking
- Worst Case: O(n²) - With maximum backtracking needed

Real-world performance measurements show:
- Small datasets (≤100 classes): Linear scaling (~0.013ms per class)
- Medium datasets (100-500 classes): Near-quadratic scaling (~0.065ms per class)
- Large datasets (500-2000 classes): Efficient handling (~0.24ms per class)

#### Constraint Types and Implementation
1. **Hard Constraints** (Must be satisfied)
   - Default class conflicts
   - Blackout dates
   - Period-specific blackouts
   - Maximum classes per day
   - Maximum classes per week

2. **Soft Constraints** (Optimization targets)
   - Grade sequencing preferences
   - Schedule density
   - Gap minimization
   - Grade grouping

## Testing

### Test Coverage
The test suite includes:
1. Basic scheduling functionality
2. Edge cases:
   - Empty class lists
   - Classes with no available periods
   - Classes with overlapping conflicts
   - Maximum consecutive periods
   - Multi-grade class scheduling
3. Real-world data tests using actual school schedule data
4. Performance scaling tests

### Real-World Data Testing
The system has been extensively tested with real schedule data including:
- Multiple grade levels (Pre-K through 5)
- Multi-grade classes (e.g., K/1/2-417, 3/4/5-518)
- Complex conflict patterns (e.g., Pre-K classes with up to 11 conflicts)
- Different scheduling densities per day
- Grade-specific scheduling patterns

Current test results show successful scheduling of 28 real-world classes with the following distribution:
- Tuesday (9/3/24): 8 classes
- Wednesday (9/4/24): 8 classes
- Thursday (9/5/24): 8 classes
- Friday (9/6/24): 4 classes

## Implementation Examples

### Basic Usage
```typescript
const scheduler = new SchedulerService(startDate, constraints);
await scheduler.initialize(classes);
const sortedClasses = scheduler.sortClassesByConstraints(classes);
const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
const schedule = scheduler.getSchedule();
```

### Configuration Example
```typescript
const constraints: ScheduleConstraints = {
    maxPeriodsPerDay: 8,
    maxPeriodsPerWeek: 40,
    blackoutPeriods: [],
    avoidConsecutivePeriods: false,
    maxConsecutivePeriods: 8
};
```

## Current Limitations
- Limited to 8 periods per day
- Fixed weekly schedule (Monday-Friday)
- No support for partial periods
- No teacher availability constraints
- No room capacity constraints

## Development Guidelines

### Adding New Features
1. Update types in `shared/types.ts`
2. Add corresponding test cases
3. Update performance metrics if algorithm changes
4. Follow TypeScript best practices
5. Maintain backward compatibility where possible

### Running Tests
```bash
npm test
```

### Adding New Tests
1. Add test cases to `scheduler.test.ts`
2. Follow existing patterns for:
   - Edge cases
   - Real-world data
   - Performance tests
3. Use the provided test utilities for:
   - Class generation
   - Constraint validation
   - Schedule verification