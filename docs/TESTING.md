# Testing Documentation

## Test Scenarios

### 1. Constraint Management

#### Blackout Period Tests
1. **Visual Interface**
   ```typescript
   describe('BlackoutCalendar', () => {
     it('should render calendar with correct periods', () => {
       // Check all periods (1-8) are displayed
       // Verify week navigation
       // Check day headers
     });

     it('should handle individual period blocking', () => {
       // Click period
       // Verify state change
       // Verify visual feedback
     });

     it('should support drag selection', () => {
       // Start drag
       // Move over multiple periods
       // Release
       // Verify all selected periods are blocked
     });

     it('should handle full day blocking', () => {
       // Click day block button
       // Verify all periods in day are blocked
       // Click again
       // Verify all periods are unblocked
     });

     it('should handle period row blocking', () => {
       // Click period row button
       // Verify period is blocked across all days
       // Click again
       // Verify period is unblocked across all days
     });

     it('should support undo/redo', () => {
       // Make several changes
       // Undo
       // Verify previous state
       // Redo
       // Verify current state
     });
   });
   ```

2. **State Management**
   ```typescript
   describe('ConstraintManager blackout handling', () => {
     it('should maintain blackout period state', () => {
       // Add blackout periods
       // Verify state updates
       // Modify existing periods
       // Verify changes
     });

     it('should validate blackout periods', () => {
       // Add invalid periods
       // Verify validation errors
       // Add valid periods
       // Verify acceptance
     });

     it('should persist blackout changes', () => {
       // Make changes
       // Save
       // Reload
       // Verify persistence
     });
   });
   ```

3. **Integration Tests**
   ```typescript
   describe('Scheduler with blackout periods', () => {
     it('should respect blackout periods during scheduling', () => {
       const blackoutPeriods = [
         { date: '2024-01-01', period: 1 },
         { date: '2024-01-01', period: 2 }
       ];
       
       // Generate schedule
       // Verify no classes scheduled during blackout periods
     });

     it('should handle overlapping constraints', () => {
       // Set blackout periods
       // Set other constraints
       // Verify all constraints are respected
     });
   });
   ```

### 2. End-to-End Testing

#### Blackout Period E2E Tests
```typescript
describe('Blackout Period E2E', () => {
  it('should manage blackout periods through UI', async () => {
    // Navigate to constraint manager
    await page.goto('/constraints');

    // Block individual period
    await page.click('[data-testid="period-1-1"]');
    await expect(page.locator('[data-testid="period-1-1"]')).toHaveClass(/bg-foreground/);

    // Block full day
    await page.click('[data-testid="block-day-button-1"]');
    await expect(page.locator('[data-testid="day-1-periods"]')).toHaveClass(/all-blocked/);

    // Save changes
    await page.click('text=Save Constraints');
    await expect(page.locator('text=Constraints saved successfully')).toBeVisible();
  });

  it('should enforce blackout periods in schedule', async () => {
    // Set up blackout periods
    // Generate schedule
    // Verify schedule respects blackouts
  });
});
```

## Test Coverage Requirements

### Blackout Period Coverage
- UI Component: 100% coverage
- State Management: 100% coverage
- Integration with Scheduler: 95% coverage
- E2E Scenarios: All critical paths

### Critical Test Cases
1. All blocking methods (individual, drag, full day, row)
2. Undo/redo functionality
3. State persistence
4. Integration with scheduler
5. Error handling and validation
6. Visual feedback and UI states

## Running Tests

### Unit Tests
```bash
# Run all tests
npm test

# Run blackout period tests
npm test -- -t "blackout"

# Run with coverage
npm test -- --coverage
```

### E2E Tests
```bash
# Start test environment
npm run dev:test

# Run E2E tests
npm run test:e2e

# Run specific E2E tests
npm run test:e2e -- -t "blackout"
``` 