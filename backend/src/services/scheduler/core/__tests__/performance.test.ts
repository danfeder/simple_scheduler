import { GeneticScheduler } from '../GeneticScheduler';
import { GraphColoringService } from '../GraphColoringService';
import { ConstraintSolver } from '../ConstraintSolver';
import { GeneticOptimizer } from '../GeneticOptimizer';
import { ScheduleCache } from '../ScheduleCache';
import { ParallelScheduler } from '../ParallelScheduler';
import { ScheduleEvaluator, EvaluatorConfig } from '../ScheduleEvaluator';
import { BasicScheduleConstraints } from '../types/Constraints';
import { PopulationConfig } from '../types/GeneticTypes';
import type { GradeLevel } from '../../../../../shared/types/base';

interface Class {
  id: string;
  classNumber: string;
  grade: GradeLevel;
  defaultConflicts: Array<{ dayOfWeek: number; period: number }>;
  active: boolean;
}

describe('Scheduler Performance Tests', () => {
  let scheduler: GeneticScheduler;
  let startTime: number;

  // Helper function to measure execution time
  const measureTime = (startTime: number): number => {
    return Date.now() - startTime;
  };

  // Helper function to create test classes with proper class number format
  const createTestClasses = (count: number): Class[] => {
    if (count > 50) {
      throw new Error('Cannot create more than 50 classes');
    }

    // Create a realistic mix of classes based on actual school structure
    const classes: Class[] = [];
    let classIndex = 0;

    // Add Pre-K classes (typically 2-3)
    for (let i = 0; i < Math.min(3, count * 0.1); i++) {
      classes.push({
        id: `class_${++classIndex}`,
        classNumber: `PK${String(101 + i).padStart(3, '0')}`,
        grade: 'Pre-K',
        defaultConflicts: [],
        active: true
      });
    }

    // Add Kindergarten classes (typically 4-5)
    for (let i = 0; i < Math.min(5, count * 0.15); i++) {
      classes.push({
        id: `class_${++classIndex}`,
        classNumber: `K-${String(201 + i).padStart(3, '0')}`,
        grade: 'K',
        defaultConflicts: [],
        active: true
      });
    }

    // Add Grade 1-5 classes (majority)
    const remainingCount = count - classes.length;
    const perGrade = Math.floor(remainingCount / 5);
    for (let grade = 1; grade <= 5; grade++) {
      for (let i = 0; i < perGrade; i++) {
        const roomNum = 300 + (grade * 100) + i;
        classes.push({
          id: `class_${++classIndex}`,
          classNumber: `${grade}-${String(roomNum).padStart(3, '0')}`,
          grade: String(grade) as GradeLevel,
          defaultConflicts: [],
          active: true
        });
      }
    }

    // Add any remaining classes as multi-grade classes
    while (classes.length < count) {
      const roomNum = 900 + classes.length - count + 1;
      classes.push({
        id: `class_${++classIndex}`,
        classNumber: `K/1/2-${String(roomNum).padStart(3, '0')}`,
        grade: 'multiple',
        defaultConflicts: [],
        active: true
      });
    }

    return classes;
  };

  beforeEach(() => {
    const scheduleConstraints: BasicScheduleConstraints = {
      maxPeriodsPerDay: 8,
      maxPeriodsPerWeek: 40,
      maxConsecutivePeriods: 4,
      avoidConsecutivePeriods: true,
      blackoutPeriods: [] as Array<{ date: Date; period: number }>
    };

    // Initialize components with performance-optimized settings
    const evaluatorConfig: EvaluatorConfig = {
      maxGapSize: 2,
      minDailyClasses: 4,
      maxDailyClasses: 8,
      preferredTeachingHours: {
        'teacher1': [1, 2, 3, 4], // Early periods
        'teacher2': [5, 6, 7], // Later periods
        'teacher3': [2, 3, 6, 7] // Mixed periods
      },
      resourceWeights: {
        'default': 1.0
      }
    };

    const populationConfig: PopulationConfig = {
      size: 50,
      elitismCount: 5,
      tournamentSize: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8
    };

    // Initialize services
    const graphColoring = new GraphColoringService(scheduleConstraints);
    const constraintSolver = new ConstraintSolver(scheduleConstraints, { maxRetries: 3 });
    const scheduleCache = new ScheduleCache();
    const parallelScheduler = new ParallelScheduler({ threadCount: 4 });
    const evaluator = new ScheduleEvaluator(evaluatorConfig);
    const geneticOptimizer = new GeneticOptimizer(
      graphColoring,
      parallelScheduler,
      scheduleCache,
      evaluator,
      populationConfig
    );

    scheduler = new GeneticScheduler(
      graphColoring,
      constraintSolver,
      geneticOptimizer,
      scheduleCache
    );
  });

  describe('Schedule Generation Performance', () => {
    it('should generate schedule for 25 classes within 5 seconds', async () => {
      const classes = createTestClasses(25);
      startTime = Date.now();
      
      const result = await scheduler.generateSchedule(classes);
      const duration = measureTime(startTime);

      expect(duration).toBeLessThan(5000);
      expect(result.success).toBe(true);
      expect(result.schedule.vertices.size).toBe(25);
    });

    it('should generate schedule for 33 classes (full load) within 8 seconds', async () => {
      const classes = createTestClasses(33);
      startTime = Date.now();
      
      const result = await scheduler.generateSchedule(classes);
      const duration = measureTime(startTime);

      expect(duration).toBeLessThan(8000);
      expect(result.success).toBe(true);
      expect(result.schedule.vertices.size).toBe(33);
    });

    it('should generate schedule for 45 classes within 10 seconds', async () => {
      const classes = createTestClasses(45);
      startTime = Date.now();
      
      const result = await scheduler.generateSchedule(classes);
      const duration = measureTime(startTime);

      expect(duration).toBeLessThan(10000);
      expect(result.success).toBe(true);
      expect(result.schedule.vertices.size).toBe(45);
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance for similar schedules', async () => {
      const classes = createTestClasses(33);
      
      // First run - populate cache
      startTime = Date.now();
      await scheduler.generateSchedule(classes);
      const firstRunDuration = measureTime(startTime);

      // Second run - should use cache
      startTime = Date.now();
      await scheduler.generateSchedule(classes);
      const secondRunDuration = measureTime(startTime);

      expect(secondRunDuration).toBeLessThan(firstRunDuration * 0.7); // At least 30% faster
    });

    it('should maintain performance with cache size limits', async () => {
      const durations: number[] = [];
      
      // Generate multiple schedules to fill cache
      for (let i = 0; i < 5; i++) {
        const classes = createTestClasses(25 + i);
        startTime = Date.now();
        await scheduler.generateSchedule(classes);
        durations.push(measureTime(startTime));
      }

      // Check that performance doesn't degrade
      const averageInitialDuration = durations.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const averageFinalDuration = durations.slice(-2).reduce((a, b) => a + b, 0) / 2;
      
      expect(averageFinalDuration).toBeLessThan(averageInitialDuration * 1.5); // No more than 50% slower
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage for large schedules', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate multiple large schedules
      for (let i = 0; i < 3; i++) {
        const classes = createTestClasses(45);
        await scheduler.generateSchedule(classes);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be less than 100MB
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Optimization Quality vs Time', () => {
    it('should achieve good quality scores within time limits', async () => {
      const classes = createTestClasses(33);
      startTime = Date.now();
      
      const result = await scheduler.generateSchedule(classes);
      const duration = measureTime(startTime);

      expect(duration).toBeLessThan(8000); // 8 seconds max
      expect(result.metrics.distributionScore).toBeGreaterThan(0.7);
      expect(result.metrics.gapScore).toBeGreaterThan(0.7);
      expect(result.metrics.resourceUtilizationScore).toBeGreaterThan(0.7);
    });

    it('should handle high-conflict scenarios efficiently', async () => {
      const classes = createTestClasses(33).map(c => ({
        ...c,
        defaultConflicts: [
          { dayOfWeek: 1, period: 1 },
          { dayOfWeek: 1, period: 2 },
          { dayOfWeek: 2, period: 1 }
        ]
      }));

      startTime = Date.now();
      const result = await scheduler.generateSchedule(classes);
      const duration = measureTime(startTime);

      expect(duration).toBeLessThan(10000); // Allow extra time for conflict resolution
      expect(result.success).toBe(true);
      expect(result.metrics.distributionScore).toBeGreaterThan(0.6); // Lower threshold due to conflicts
    });
  });
}); 