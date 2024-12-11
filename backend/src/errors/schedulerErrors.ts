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

// Add error codes enum for consistency
export enum SchedulerErrorCode {
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  OPTIMIZATION_FAILED = 'OPTIMIZATION_FAILED',
  ROOM_ASSIGNMENT_FAILED = 'ROOM_ASSIGNMENT_FAILED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT'
} 