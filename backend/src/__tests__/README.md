# Test Coverage Documentation

## Scheduler Service Tests
Located in `scheduler/`

### Core Scheduling (`scheduler.test.ts`)
- Basic scheduling functionality
- Constraint handling:
  - Maximum periods per day
  - Consecutive period restrictions
  - Class-specific conflicts
- Edge cases:
  - Empty class lists
  - Impossible schedules
  - Overlapping conflicts
  - Day boundary handling

### Blackout Period Handling (`blackout.test.ts`)
- Single period blackouts
- Multi-day blackouts
- Full day blocking
- Period-specific blocking across multiple days

## Test Organization
```
backend/src/__tests__/
├── scheduler/
│   ├── scheduler.test.ts  (core scheduling logic)
│   └── blackout.test.ts   (blackout period handling)
└── README.md
```

## Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test scheduler.test.ts
npm test blackout.test.ts
``` 