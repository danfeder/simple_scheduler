# Frontend-Backend Integration Plan

## Overview
This document outlines the integration plan between the TypeScript-based scheduling backend and the React-based frontend components. The integration will enable seamless communication between the UI components and the scheduling algorithm.

### Key Goals
- Maintain type safety across the full stack
- Ensure consistent data models between frontend and backend
- Provide real-time feedback during schedule generation
- Handle errors gracefully with meaningful user feedback
- Support incremental feature rollout

## Component Integration Points

### 1. Class Manager (`ClassManager.tsx`)
#### Current Implementation
- Manages class data with conflicts in frontend state
- Provides UI for importing PDF schedules
- Allows manual conflict management through grid interface

#### Integration Tasks
1. Update `Class` interface to match backend:
```typescript
// Shared type definition (shared/types/index.ts)
interface Class {
  id: string;
  name: string;
  gradeLevel: GradeLevel; // Using enum from existing backend
  defaultConflicts: Array<Conflict>;
  active: boolean;
}

interface Conflict {
  dayOfWeek: DayOfWeek; // Using enum from existing backend
  period: Period; // Using type from existing backend
}
```

2. Add API endpoints:
- `GET /api/classes` - Fetch all classes
- `POST /api/classes` - Create new class
- `PUT /api/classes/:id` - Update class conflicts
- `POST /api/classes/import` - Import PDF schedule
- `DELETE /api/classes/:id` - Delete class
- `GET /api/classes/:id/conflicts` - Get specific class conflicts

3. Connect PDF import to backend parser:
```typescript
const importPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('/api/classes/import', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Import failed');
    const classes = await response.json();
    setClasses(classes);
    showSuccessNotification('Schedule imported successfully');
  } catch (error) {
    showErrorNotification('Failed to import schedule');
    console.error('Import error:', error);
  }
};
```

### 2. Constraint Manager (`ConstraintManager.tsx`)
#### Current Implementation
- Manages scheduling constraints in frontend state
- Handles basic validation and UI updates
- Visual calendar interface for blackout period management
- Undo/redo functionality for constraint changes

#### Integration Tasks
1. Update constraint interface to match backend:
```typescript
// Shared type definition (shared/types/index.ts)
interface ScheduleConstraints {
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  blackoutPeriods: Array<BlackoutPeriod>;
  avoidConsecutivePeriods: boolean;
  maxConsecutivePeriods: number;
}

interface BlackoutPeriod {
  date: string;  // ISO date string
  period: number;  // 1-8
}
```

2. Add API endpoints:
- `GET /api/constraints` - Fetch current constraints
- `PUT /api/constraints` - Update constraints
- `GET /api/constraints/validate` - Validate constraint set
- `GET /api/constraints/templates` - Get preset constraint templates

3. Implement constraint persistence with validation:
```typescript
const saveConstraints = async () => {
  const constraints: ScheduleConstraints = {
    maxPeriodsPerDay,
    maxPeriodsPerWeek,
    blackoutPeriods: parseBlackoutPeriods(blackoutPeriods),
    avoidConsecutivePeriods,
    maxConsecutivePeriods
  };
  
  try {
    // Validate first
    const validateResponse = await fetch('/api/constraints/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constraints)
    });
    if (!validateResponse.ok) throw new Error('Validation failed');
    
    // Save if valid
    const saveResponse = await fetch('/api/constraints', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constraints)
    });
    if (!saveResponse.ok) throw new Error('Save failed');
    
    showSuccessNotification('Constraints saved successfully');
  } catch (error) {
    showErrorNotification('Failed to save constraints');
    console.error('Constraint save error:', error);
  }
};
```

4. Blackout Period Management:
- See detailed documentation in `BLACKOUT_PERIODS.md`
- Implements visual calendar interface
- Supports multiple blocking methods
- Includes undo/redo functionality

### 3. Schedule Generator (`ScheduleGenerator.tsx`)
#### Current Implementation
- Basic UI for date selection
- Placeholder for schedule generation
- No actual integration with backend algorithm

#### Integration Tasks
1. Add schedule interfaces:
```typescript
// Shared type definition (shared/types/index.ts)
interface ScheduledClass {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: DayOfWeek;
  period: Period;
  room?: string;
}

interface Schedule {
  classes: ScheduledClass[];
  metadata: ScheduleMetadata;
  quality: ScheduleQuality;
}

interface ScheduleMetadata {
  generatedAt: Date;
  version: string;
  qualityScore?: number;
}

interface ScheduleQuality {
  totalScore: number;
  metrics: {
    dayDistribution: number;
    timeGaps: number;
    periodUtilization: number;
  };
}
```

2. Add API endpoints:
- `POST /api/schedule/generate` - Generate new schedule
- `GET /api/schedule/:id` - Fetch specific schedule
- `GET /api/schedule/current` - Fetch current schedule
- `POST /api/schedule/:id/optimize` - Optimize existing schedule
- `GET /api/schedule/status` - Get generation status

3. Implement schedule generation with progress updates:
```typescript
const generateSchedule = async () => {
  if (!startDate) return;
  
  try {
    // Start generation
    const response = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate })
    });
    if (!response.ok) throw new Error('Generation failed');
    const { scheduleId } = await response.json();
    
    // Poll for status
    const schedule = await pollScheduleStatus(scheduleId);
    setGeneratedSchedule(schedule);
    showSuccessNotification('Schedule generated successfully');
  } catch (error) {
    showErrorNotification('Failed to generate schedule');
    console.error('Generation error:', error);
  }
};

const pollScheduleStatus = async (scheduleId: string): Promise<Schedule> => {
  const poll = async (): Promise<Schedule> => {
    const response = await fetch(`/api/schedule/status/${scheduleId}`);
    const status = await response.json();
    
    if (status.state === 'completed') {
      return status.schedule;
    } else if (status.state === 'failed') {
      throw new Error(status.error);
    } else {
      updateProgress(status.progress);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return poll();
    }
  };
  
  return poll();
};
```

## Backend API Implementation

### 1. Express Routes
Create the following route files:
```typescript
// routes/classes.ts
router.get('/api/classes', ClassController.getAll);
router.post('/api/classes', ClassController.create);
router.put('/api/classes/:id', ClassController.update);
router.delete('/api/classes/:id', ClassController.delete);
router.post('/api/classes/import', ClassController.importPDF);
router.get('/api/classes/:id/conflicts', ClassController.getConflicts);

// routes/constraints.ts
router.get('/api/constraints', ConstraintController.get);
router.put('/api/constraints', ConstraintController.update);
router.post('/api/constraints/validate', ConstraintController.validate);
router.get('/api/constraints/templates', ConstraintController.getTemplates);

// routes/schedule.ts
router.post('/api/schedule/generate', ScheduleController.generate);
router.get('/api/schedule/:id', ScheduleController.get);
router.get('/api/schedule/current', ScheduleController.getCurrent);
router.post('/api/schedule/:id/optimize', ScheduleController.optimize);
router.get('/api/schedule/status/:id', ScheduleController.getStatus);
```

### 2. Controller Layer
Implement controllers with proper error handling:
```typescript
// controllers/ScheduleController.ts
class ScheduleController {
  private scheduler: SchedulerService;
  private scheduleQueue: Map<string, ScheduleJob>;
  
  async generate(req: Request, res: Response) {
    try {
      const { startDate } = req.body;
      const constraints = await this.getConstraints();
      const classes = await this.getActiveClasses();
      
      // Create job and return ID immediately
      const jobId = uuid();
      this.scheduleQueue.set(jobId, {
        state: 'pending',
        progress: 0
      });
      res.json({ scheduleId: jobId });
      
      // Start generation in background
      this.generateInBackground(jobId, startDate, constraints, classes);
    } catch (error) {
      handleError(error, res);
    }
  }
  
  private async generateInBackground(
    jobId: string,
    startDate: Date,
    constraints: ScheduleConstraints,
    classes: Class[]
  ) {
    try {
      this.scheduleQueue.set(jobId, { state: 'running', progress: 0 });
      
      this.scheduler = new SchedulerService(
        startDate,
        constraints,
        (progress) => this.updateProgress(jobId, progress)
      );
      
      await this.scheduler.initialize(classes);
      const schedule = await this.scheduler.generateSchedule();
      
      await this.saveSchedule(schedule);
      this.scheduleQueue.set(jobId, {
        state: 'completed',
        schedule
      });
    } catch (error) {
      this.scheduleQueue.set(jobId, {
        state: 'failed',
        error: error.message
      });
    }
  }
}
```

### 3. Service Layer Integration
Enhance `SchedulerService` with progress reporting:
```typescript
class SchedulerService {
  constructor(
    startDate: Date,
    constraints: ScheduleConstraints,
    private onProgress?: (progress: number) => void
  ) {
    this.startDate = startDate;
    this.constraints = constraints;
  }
  
  private reportProgress(progress: number) {
    if (this.onProgress) {
      this.onProgress(Math.min(100, Math.max(0, progress)));
    }
  }
  
  async generateSchedule(): Promise<Schedule> {
    const sortedClasses = this.sortClassesByConstraints(this.classes);
    let progress = 0;
    const progressIncrement = 100 / sortedClasses.length;
    
    for (const classDoc of sortedClasses) {
      await this.scheduleClass(classDoc);
      progress += progressIncrement;
      this.reportProgress(progress);
    }
    
    return {
      classes: this.schedule,
      metadata: this.generateMetadata(),
      quality: this.evaluateScheduleQuality()
    };
  }
}
```

## Scheduler Service Integration Details

### 1. Core Scheduler Integration

The existing scheduler service (`SchedulerService`) will be wrapped with additional functionality to support API-based operations:

```typescript
// services/scheduler/apiSchedulerService.ts
export class ApiSchedulerService {
  private scheduler: SchedulerService;
  private readonly db: DatabaseService;
  private readonly cache: CacheService;

  constructor(
    db: DatabaseService,
    cache: CacheService
  ) {
    this.db = db;
    this.cache = cache;
  }

  async initializeScheduler(
    startDate: Date,
    constraints: ScheduleConstraints,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Create new scheduler instance with provided parameters
    this.scheduler = new SchedulerService(startDate, constraints, onProgress);
    
    // Load active classes from database
    const classes = await this.db.classes.findActive();
    await this.scheduler.initialize(classes);
  }

  async generateScheduleWithRetry(
    jobId: string,
    maxAttempts: number = 3
  ): Promise<Schedule> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      try {
        // Attempt schedule generation
        const schedule = await this.scheduler.generateSchedule();
        
        // Validate generated schedule
        const validation = await this.validateSchedule(schedule);
        if (!validation.isValid) {
          throw new Error(`Schedule validation failed: ${validation.reason}`);
        }

        // Calculate schedule quality metrics
        const quality = await this.scheduler.evaluateScheduleQuality();
        
        // If quality score is too low, retry with adjusted parameters
        if (quality.totalScore < 0.7 && attempt < maxAttempts - 1) {
          this.adjustSchedulerParameters();
          attempt++;
          continue;
        }

        // Store successful schedule
        await this.saveSchedule(jobId, schedule, quality);
        return schedule;

      } catch (error) {
        lastError = error;
        attempt++;
        
        // Log failure and adjust parameters for retry
        console.error(`Schedule generation attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await this.handleRetry(error);
        }
      }
    }

    throw new Error(`Failed to generate schedule after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
  }

  private async validateSchedule(schedule: Schedule): Promise<ValidationResult> {
    // Validate class assignments
    const classValidation = await this.validateClassAssignments(schedule);
    if (!classValidation.isValid) return classValidation;

    // Validate constraint compliance
    const constraintValidation = await this.validateConstraints(schedule);
    if (!constraintValidation.isValid) return constraintValidation;

    // Validate room assignments
    const roomValidation = await this.validateRoomAssignments(schedule);
    if (!roomValidation.isValid) return roomValidation;

    return { isValid: true };
  }

  private async validateClassAssignments(schedule: Schedule): Promise<ValidationResult> {
    for (const scheduledClass of schedule.classes) {
      // Check for double-bookings
      const conflicts = schedule.classes.filter(other => 
        other.id !== scheduledClass.id &&
        other.dayOfWeek === scheduledClass.dayOfWeek &&
        other.period === scheduledClass.period
      );
      
      if (conflicts.length > 0) {
        return {
          isValid: false,
          reason: `Class ${scheduledClass.name} has conflicts with: ${conflicts.map(c => c.name).join(', ')}`
        };
      }

      // Check against class-specific constraints
      const classDoc = await this.db.classes.findById(scheduledClass.id);
      if (!classDoc) {
        return {
          isValid: false,
          reason: `Class ${scheduledClass.id} not found in database`
        };
      }

      const hasConflict = classDoc.defaultConflicts.some(conflict =>
        conflict.dayOfWeek === scheduledClass.dayOfWeek &&
        conflict.period === scheduledClass.period
      );

      if (hasConflict) {
        return {
          isValid: false,
          reason: `Class ${scheduledClass.name} scheduled during conflict period`
        };
      }
    }

    return { isValid: true };
  }

  private async validateConstraints(schedule: Schedule): Promise<ValidationResult> {
    const constraints = this.scheduler.getConstraints();
    
    // Check periods per day
    const classesByDay = new Map<number, number>();
    for (const scheduledClass of schedule.classes) {
      const count = (classesByDay.get(scheduledClass.dayOfWeek) || 0) + 1;
      if (count > constraints.maxPeriodsPerDay) {
        return {
          isValid: false,
          reason: `Day ${scheduledClass.dayOfWeek} exceeds max periods (${count} > ${constraints.maxPeriodsPerDay})`
        };
      }
      classesByDay.set(scheduledClass.dayOfWeek, count);
    }

    // Check consecutive periods
    if (constraints.avoidConsecutivePeriods) {
      for (const [day, classes] of classesByDay) {
        const periods = schedule.classes
          .filter(c => c.dayOfWeek === day)
          .map(c => c.period)
          .sort();

        for (let i = 1; i < periods.length; i++) {
          if (periods[i] === periods[i - 1] + 1) {
            return {
              isValid: false,
              reason: `Consecutive periods found on day ${day}`
            };
          }
        }
      }
    }

    return { isValid: true };
  }

  private async validateRoomAssignments(schedule: Schedule): Promise<ValidationResult> {
    const roomAssignments = new Map<string, Set<string>>();
    
    for (const scheduledClass of schedule.classes) {
      if (!scheduledClass.room) continue;

      const timeSlotKey = `${scheduledClass.dayOfWeek}-${scheduledClass.period}`;
      const roomSet = roomAssignments.get(timeSlotKey) || new Set();

      if (roomSet.has(scheduledClass.room)) {
        return {
          isValid: false,
          reason: `Room ${scheduledClass.room} double-booked at ${timeSlotKey}`
        };
      }

      roomSet.add(scheduledClass.room);
      roomAssignments.set(timeSlotKey, roomSet);
    }

    return { isValid: true };
  }

  private async saveSchedule(
    jobId: string,
    schedule: Schedule,
    quality: ScheduleQuality
  ): Promise<void> {
    const scheduleRecord = {
      jobId,
      schedule,
      quality,
      metadata: {
        generatedAt: new Date(),
        version: '1.0',
        qualityScore: quality.totalScore
      },
      status: 'completed' as const
    };

    await this.db.schedules.create(scheduleRecord);
    await this.cache.set(`schedule:${jobId}`, scheduleRecord);
  }

  private async handleRetry(error: Error): Promise<void> {
    // Analyze error and adjust scheduler parameters
    if (error instanceof ConstraintViolationError) {
      await this.relaxConstraints();
    } else if (error instanceof RoomAssignmentError) {
      await this.expandRoomAvailability();
    } else if (error instanceof OptimizationError) {
      this.adjustOptimizationParameters();
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async relaxConstraints(): Promise<void> {
    const constraints = this.scheduler.getConstraints();
    
    // Gradually relax constraints for retry
    const relaxedConstraints: ScheduleConstraints = {
      ...constraints,
      maxConsecutivePeriods: constraints.maxConsecutivePeriods + 1,
      avoidConsecutivePeriods: false,
    };

    await this.scheduler.updateConstraints(relaxedConstraints);
  }

  private adjustOptimizationParameters(): void {
    const currentConfig = this.scheduler.getConfig();
    
    // Adjust weights for next attempt
    this.scheduler.updateConfig({
      ...currentConfig,
      dayDistributionWeight: currentConfig.dayDistributionWeight * 0.9,
      spacingWeight: currentConfig.spacingWeight * 1.1
    });
  }
}

// controllers/ScheduleController.ts
export class ScheduleController {
  private apiScheduler: ApiSchedulerService;
  private scheduleQueue: Map<string, ScheduleJob>;

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService
  ) {
    this.apiScheduler = new ApiSchedulerService(db, cache);
    this.scheduleQueue = new Map();
  }

  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { startDate } = req.body;
      const constraints = await this.db.constraints.getCurrent();
      
      // Create job
      const jobId = uuid();
      this.scheduleQueue.set(jobId, {
        state: 'pending',
        progress: 0
      });
      
      // Return job ID immediately
      res.json({ scheduleId: jobId });
      
      // Start generation in background
      this.generateInBackground(jobId, new Date(startDate), constraints);
    } catch (error) {
      handleError(error, res);
    }
  }

  private async generateInBackground(
    jobId: string,
    startDate: Date,
    constraints: ScheduleConstraints
  ): Promise<void> {
    try {
      // Initialize scheduler
      await this.apiScheduler.initializeScheduler(
        startDate,
        constraints,
        (progress) => this.updateProgress(jobId, progress)
      );

      // Generate schedule with retry logic
      const schedule = await this.apiScheduler.generateScheduleWithRetry(jobId);

      // Update job status
      this.scheduleQueue.set(jobId, {
        state: 'completed',
        schedule
      });
    } catch (error) {
      this.scheduleQueue.set(jobId, {
        state: 'failed',
        error: error.message
      });
      
      // Log detailed error for debugging
      console.error('Schedule generation failed:', {
        jobId,
        startDate,
        error: error.stack
      });
    }
  }

  private updateProgress(jobId: string, progress: number): void {
    const currentJob = this.scheduleQueue.get(jobId);
    if (currentJob && currentJob.state === 'running') {
      this.scheduleQueue.set(jobId, {
        ...currentJob,
        progress
      });
    }
  }
}

### 2. Database Schema Updates

To support the API integration, we'll need to add new collections:

```typescript
// models/Schedule.ts
interface ScheduleModel {
  jobId: string;
  schedule: Schedule;
  quality: ScheduleQuality;
  metadata: ScheduleMetadata;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// models/Constraint.ts
interface ConstraintModel {
  id: string;
  constraints: ScheduleConstraints;
  isDefault: boolean;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Caching Layer

Implement caching for frequently accessed data:

```typescript
// services/cache/scheduleCache.ts
export class ScheduleCache {
  private readonly redis: Redis;
  private readonly TTL = 3600; // 1 hour

  async getCachedSchedule(jobId: string): Promise<Schedule | null> {
    const cached = await this.redis.get(`schedule:${jobId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheSchedule(jobId: string, schedule: Schedule): Promise<void> {
    await this.redis.setex(
      `schedule:${jobId}`,
      this.TTL,
      JSON.stringify(schedule)
    );
  }

  async invalidateSchedule(jobId: string): Promise<void> {
    await this.redis.del(`schedule:${jobId}`);
  }
}
```

### 4. Error Handling

Add specific error types for scheduler operations:

```typescript
// errors/schedulerErrors.ts
export class SchedulerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SchedulerError';
  }
}

export class ConstraintViolationError extends SchedulerError {
  constructor(message: string) {
    super(message, 'CONSTRAINT_VIOLATION');
    this.name = 'ConstraintViolationError';
  }
}

export class OptimizationError extends SchedulerError {
  constructor(message: string) {
    super(message, 'OPTIMIZATION_FAILED');
    this.name = 'OptimizationError';
  }
}

export class RoomAssignmentError extends SchedulerError {
  constructor(message: string) {
    super(message, 'ROOM_ASSIGNMENT_FAILED');
    this.name = 'RoomAssignmentError';
  }
}
```

### 5. Monitoring and Logging

Add monitoring for scheduler operations:

```typescript
// monitoring/schedulerMetrics.ts
export class SchedulerMetrics {
  private readonly metrics: PrometheusMetrics;

  private readonly generateDuration = new Histogram({
    name: 'scheduler_generation_duration_seconds',
    help: 'Duration of schedule generation'
  });

  private readonly generationAttempts = new Counter({
    name: 'scheduler_generation_attempts_total',
    help: 'Number of schedule generation attempts'
  });

  private readonly constraintViolations = new Counter({
    name: 'scheduler_constraint_violations_total',
    help: 'Number of constraint violations encountered'
  });

  recordGeneration(duration: number): void {
    this.generateDuration.observe(duration);
  }

  recordAttempt(): void {
    this.generationAttempts.inc();
  }

  recordConstraintViolation(): void {
    this.constraintViolations.inc();
  }
}
```

This enhanced integration:
1. Provides detailed retry logic for failed schedule generation
2. Implements thorough schedule validation
3. Adds caching for performance optimization
4. Includes specific error handling for scheduler operations
5. Adds monitoring and metrics
6. Maintains backward compatibility with existing scheduler logic

## Data Flow and State Management

1. Class Management Flow:
```
Frontend Class Manager
→ API Request
→ ClassController
→ MongoDB (via Mongoose)
→ Response
→ Update UI State
→ Trigger Dependent Component Updates
```

2. Constraint Management Flow:
```
Frontend Constraint Manager
→ Validation Request
→ ConstraintController.validate
→ Validation Logic
→ If Valid: Save to Database
→ Response with Validation Results
→ Update UI State + Show Feedback
```

3. Schedule Generation Flow:
```
Frontend Schedule Generator
→ Generation Request
→ ScheduleController
→ Create Background Job
→ Return Job ID
→ Start Background Processing
→ Poll Status Endpoint
→ Update Progress UI
→ Receive Final Schedule
→ Update UI with Schedule View
```

## Error Handling

1. Define error types:
```typescript
// shared/types/errors.ts
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  GENERATION_FAILED = 'GENERATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
}
```

2. Implement error handling middleware:
```typescript
// middleware/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.details
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      code: ErrorCode.NOT_FOUND,
      message: err.message
    });
  }
  
  res.status(500).json({
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
```

3. Frontend error handling:
```typescript
// utils/apiClient.ts
export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error: ApiError = await response.json();
    showErrorNotification(error.message);
    throw new Error(error.message);
  }
  return response;
};
```

## Testing Strategy

### 1. Integration Tests
```typescript
// __tests__/integration/schedule.test.ts
describe('Schedule Generation Integration', () => {
  it('should generate schedule with valid constraints', async () => {
    // Setup test data
    const classes = await createTestClasses();
    const constraints = createTestConstraints();
    
    // Start generation
    const { scheduleId } = await startGeneration(constraints);
    
    // Poll until complete
    const schedule = await waitForSchedule(scheduleId);
    
    // Verify schedule
    expect(schedule.classes).toHaveLength(classes.length);
    expect(schedule.quality.totalScore).toBeGreaterThan(0.7);
    
    // Verify constraints are met
    verifyScheduleConstraints(schedule, constraints);
  });
});
```

### 2. End-to-End Tests
```typescript
// e2e/schedule.spec.ts
describe('Schedule Generation E2E', () => {
  it('should generate schedule through UI', async () => {
    // Import test schedule
    await page.click('[data-testid="import-button"]');
    await page.uploadFile('input[type="file"]', 'test-schedule.pdf');
    
    // Set constraints
    await page.fill('#maxPeriodsPerDay', '4');
    await page.click('text=Save Constraints');
    
    // Generate schedule
    await page.click('text=Generate Schedule');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="schedule-view"]');
    
    // Verify schedule display
    const scheduleElements = await page.$$('[data-testid="scheduled-class"]');
    expect(scheduleElements.length).toBeGreaterThan(0);
  });
});
```

## Deployment Considerations

### 1. Environment Configuration
```typescript
// config/environment.ts
export const config = {
  api: {
    baseUrl: process.env.API_BASE_URL || '/api',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
  },
  database: {
    url: process.env.MONGODB_URL,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
};
```

### 2. API Documentation
Use OpenAPI/Swagger for documentation:
```yaml
openapi: 3.0.0
info:
  title: School Schedule API
  version: 1.0.0
paths:
  /api/schedule/generate:
    post:
      summary: Generate new schedule
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateScheduleRequest'
      responses:
        '200':
          description: Schedule generation started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateScheduleResponse'
```

## Implementation Phases

### Phase 1 - Core Integration (Week 1-2)
- Set up API project structure
- Implement basic CRUD operations
- Connect frontend components to API
- Basic error handling

### Phase 2 - Enhanced Features (Week 3-4)
- PDF import/export functionality
- Schedule optimization
- Real-time progress updates
- Advanced error handling

### Phase 3 - Polish (Week 5-6)
- UI loading states
- Error notifications
- Performance optimization
- Documentation

## Next Steps

### 1. Finalize Backend Scheduler Integration

#### a. Complete Retry Logic
- Implement exponential backoff in `generateScheduleWithRetry`:
```typescript
private async generateScheduleWithRetry(
  jobId: string,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<Schedule> {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      return await this.attemptGeneration();
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts) throw error;
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        30000 // Max 30 second delay
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Adjust parameters based on error type
      await this.adjustParametersForRetry(error, attempt);
    }
  }
}
```

#### b. Thorough Testing
1. Unit Tests:
```typescript
describe('ApiSchedulerService', () => {
  describe('generateScheduleWithRetry', () => {
    it('should retry with exponential backoff', async () => {
      // Test retry timing
    });
    
    it('should adjust parameters between retries', async () => {
      // Test parameter adjustment
    });
    
    it('should maintain schedule quality above threshold', async () => {
      // Test quality validation
    });
  });
  
  describe('validateSchedule', () => {
    it('should catch all constraint violations', async () => {
      // Test constraint validation
    });
    
    it('should validate room assignments', async () => {
      // Test room validation
    });
  });
});
```

2. Integration Tests:
```typescript
describe('Scheduler Integration', () => {
  it('should handle concurrent schedule generation', async () => {
    // Test multiple simultaneous generations
  });
  
  it('should recover from database failures', async () => {
    // Test database error recovery
  });
  
  it('should maintain cache consistency', async () => {
    // Test cache updates
  });
});
```

### 2. Deploy for User Testing and Feedback

#### a. Staging Deployment
1. Set up staging environment:
```bash
# Infrastructure setup
terraform apply -var-file=staging.tfvars

# Database initialization
npm run db:migrate:staging

# Deploy application
npm run deploy:staging
```

2. Configure monitoring:
- Set up Prometheus metrics collection
- Configure alerting for failed generations
- Set up error tracking (e.g., Sentry)

#### b. User Testing Plan
1. Initial Beta Testing:
- Select 3-5 power users
- Provide detailed testing scenarios
- Set up feedback collection system

2. Testing Scenarios:
```markdown
## Test Case 1: Basic Schedule Generation
1. Import sample class data
2. Set basic constraints
3. Generate schedule
4. Verify results

## Test Case 2: Complex Constraints
1. Set multiple overlapping constraints
2. Add room restrictions
3. Generate schedule
4. Verify constraint compliance

## Test Case 3: Error Recovery
1. Introduce invalid constraints
2. Verify error messages
3. Correct constraints
4. Complete generation
```

3. Feedback Collection:
- Create structured feedback form
- Set up bug reporting channel
- Schedule weekly review meetings

#### c. Monitoring and Iteration
1. Key Metrics to Track:
- Schedule generation success rate
- Average generation time
- Constraint violation frequency
- User satisfaction scores

2. Iteration Process:
- Weekly code updates based on feedback
- Performance optimization based on metrics
- UI/UX improvements based on user behavior

### 3. Implementation Timeline

Week 1:
- Complete retry logic implementation
- Write comprehensive tests
- Set up staging environment

Week 2:
- Deploy to staging
- Configure monitoring
- Begin beta testing

Week 3:
- Collect and analyze initial feedback
- Make critical adjustments
- Expand user testing group

Week 4:
- Implement improvements based on feedback
- Optimize performance
- Prepare for production deployment

### 4. Success Criteria

1. Technical Metrics:
- 95%+ schedule generation success rate
- < 30 second average generation time
- Zero critical bugs in production
- 99.9% API availability

2. User Satisfaction:
- Positive feedback from 80%+ of beta users
- Successfully generated schedules for all test cases
- Intuitive error messages (verified by user feedback)
- Smooth recovery from all error scenarios

3. Performance Goals:
- Support concurrent schedule generation
- Handle 100+ classes per schedule
- Maintain response times under 100ms for API endpoints
- Cache hit rate > 90% for frequent operations
```

## Migration Notes

When migrating from the current implementation:
1. Keep existing scheduler algorithm intact
2. Wrap with new API layer
3. Update frontend gradually
4. Maintain backward compatibility
5. Add new features incrementally