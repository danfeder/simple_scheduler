# School Schedule Generator

## Project Overview
This project implements an automated class scheduling system for a school, capable of generating conflict-free schedules while respecting various constraints. The system uses a backtracking algorithm to find valid schedules and includes comprehensive testing with both synthetic and real-world data from an actual school schedule.

> **Current Development Status**: We are currently in the process of integrating the backend scheduler with a frontend interface. For detailed information about the integration progress, implementation timeline, and next steps, please refer to [../docs/INTEGRATION.md](../docs/INTEGRATION.md).

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

#### Constraint Handling
- Daily and weekly period limits per class
- Total periods per day across all classes
- Blackout period restrictions with date-specific conflicts
- Consecutive period limitations with configurable maximum
- Class-specific conflicts with day and period granularity
- Support for multi-grade classes with complex conflict patterns

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

### Performance Testing
Performance tests demonstrate:
- Linear scaling for small datasets (up to 100 classes)
- Near-quadratic scaling for medium datasets (100-500 classes)
- Efficient handling of large datasets (500-2000 classes)
- Scale factors:
  - 100 to 500 classes: ~2.86x (vs theoretical 25x)
  - 500 to 1000 classes: ~4.40x (vs theoretical 4x)
  - 1000 to 2000 classes: ~1.22x (vs theoretical 4x)

## Usage

### Basic Usage
```typescript
const scheduler = new SchedulerService(startDate, constraints);
await scheduler.initialize(classes);
const sortedClasses = scheduler.sortClassesByConstraints(classes);
const success = await scheduler.scheduleWithBacktracking(sortedClasses, startDate);
const schedule = scheduler.getSchedule();
```

### Configuration
```typescript
const constraints: ScheduleConstraints = {
    maxPeriodsPerDay: 8,
    maxPeriodsPerWeek: 40,
    blackoutPeriods: [],
    avoidConsecutivePeriods: false,
    maxConsecutivePeriods: 8
};
```

## Development Status

### Current Phase
We are implementing the frontend-backend integration as outlined in the [Integration Plan](../docs/INTEGRATION.md). Key focus areas:
- Finalizing backend scheduler integration with robust retry logic
- Implementing comprehensive testing
- Preparing for user testing deployment

### Completed Features
- ✅ Core scheduling algorithm with state restoration
- ✅ Comprehensive constraint validation
- ✅ Real-world data testing with actual school schedule
- ✅ Performance optimization and scaling analysis
- ✅ Edge case handling including multi-grade classes
- ✅ Support for complex conflict patterns
- ✅ Basic frontend components for schedule management

### Current Limitations
- Limited to 8 periods per day
- Fixed weekly schedule (Monday-Friday)
- No support for partial periods
- No teacher availability constraints
- No room capacity constraints

### Next Steps
Please refer to [../docs/INTEGRATION.md](../docs/INTEGRATION.md) for detailed next steps and implementation timeline.

## Testing Instructions

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

## Contributing
When adding new features:
1. Update types in `shared/types.ts`
2. Add corresponding test cases
3. Document changes in this README
4. Ensure all existing tests pass
5. Update performance metrics if algorithm changes