# Blackout Periods

## Overview
Blackout periods allow administrators to specify times when classes cannot be scheduled. The system provides a visual calendar interface for managing these restrictions.

## Features

### Visual Calendar Interface
- Week-based view showing periods 1-8 for each weekday
- Navigation between weeks
- Visual indication of blocked/unblocked periods
- Drag selection for multiple periods
- Undo/redo functionality for all changes

### Blocking Methods
1. **Individual Periods**
   - Click or drag to block/unblock individual time slots
   - Visual feedback shows blocked (dark) vs available (light) periods
   - Hover effects indicate interactive elements

2. **Full Day Blocking**
   - Button at top of each day column
   - Blocks/unblocks all periods for that day
   - Shows current state (blocked/unblocked)

3. **Cross-Day Period Blocking**
   - Button on the left side of each row
   - Blocks/unblocks the same period across all days in the week
   - Useful for consistent weekly patterns

## Technical Implementation

### Data Structure
```typescript
interface BlackoutPeriod {
  date: string;    // ISO date string
  period: number;  // 1-8
}

interface Constraints {
  // ... other constraints ...
  blackoutPeriods: BlackoutPeriod[];
}
```

### State Management
- Maintains history stack for undo/redo functionality
- Efficient updates using state immutability
- Optimized period checking for performance

### User Interactions
1. **Click Operations**
   - Single click: Toggle individual period
   - Click + drag: Toggle multiple periods
   - Full day button: Toggle all periods in a day
   - Period row button: Toggle period across all days

2. **Visual Feedback**
   - Clear state indication (blocked/unblocked)
   - Hover effects for interactive elements
   - Consistent styling with app theme

## Integration with Scheduler

### Validation
The scheduler validates blackout periods during schedule generation:
```typescript
private hasConflict(classDoc: Class, date: Date, period: Period): boolean {
  // Check blackout periods
  const isBlackout = this.constraints.blackoutPeriods.some(
    blackout =>
      blackout.date.getTime() === date.getTime() &&
      blackout.period === period
  );
  if (isBlackout) return true;
  // ... other conflict checks
}
```

### Performance Considerations
- Efficient lookup of blocked periods using date/period combinations
- Optimized state updates for smooth interaction
- Memoized calculations for frequently checked states

## Usage Guidelines

### Best Practices
1. Use drag selection for blocking multiple consecutive periods
2. Use full day blocking for holidays or off days
3. Use period row blocking for recurring restrictions
4. Review changes using undo/redo before saving

### Common Operations
1. **Block a Single Period**
   - Click on the desired time slot
   - Visual feedback confirms the change

2. **Block Multiple Periods**
   - Click and drag across desired slots
   - Release to confirm selection

3. **Block Full Days**
   - Use the button at the top of each day
   - All periods in that day will be blocked/unblocked

4. **Block Same Period Across Days**
   - Use the button on the left of each period row
   - That period will be blocked/unblocked for all days

5. **Undo/Redo Changes**
   - Use the undo/redo buttons above the calendar
   - Changes are tracked until saved 