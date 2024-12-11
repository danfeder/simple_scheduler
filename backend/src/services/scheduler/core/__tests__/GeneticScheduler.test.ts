import { GeneticScheduler } from '../GeneticScheduler';
import { GraphColoringService } from '../GraphColoringService';
import { ConstraintSolver } from '../ConstraintSolver';
import { GeneticOptimizer } from '../GeneticOptimizer';
import { ScheduleCache } from '../ScheduleCache';
import { ParallelScheduler } from '../ParallelScheduler';
import { ScheduleEvaluator } from '../ScheduleEvaluator';
import { ScheduleGraph } from '../types/Graph';
import { PopulationConfig } from '../types/GeneticTypes';
import { ScheduleConstraints } from '../types/Constraints';
import { GradeLevel } from '../../../shared/types';

describe('GeneticScheduler Integration Tests', () => {
  let scheduler: GeneticScheduler;
  let graphColoring: GraphColoringService;
  let constraintSolver: ConstraintSolver;
  let geneticOptimizer: GeneticOptimizer;
  let scheduleCache: ScheduleCache;
  let parallelScheduler: ParallelScheduler;
  let evaluator: ScheduleEvaluator;

  beforeEach(() => {
    const scheduleConstraints: ScheduleConstraints = {
      maxPeriodsPerDay: 8,
      maxPeriodsPerWeek: 40,
      maxConsecutivePeriods: 4,
      avoidConsecutivePeriods: true,
      blackoutPeriods: []
    };

    // Initialize all components with real implementations
    graphColoring = new GraphColoringService(scheduleConstraints);
    constraintSolver = new ConstraintSolver(scheduleConstraints);
    scheduleCache = new ScheduleCache();
    parallelScheduler = new ParallelScheduler();
    
    const evaluatorConfig = {
      maxGapSize: 2,
      minDailyClasses: 4,
      maxDailyClasses: 8,
      resourceWeights: {
        'classroom': 1.0,
        'lab': 1.5,
        'gym': 1.2
      }
    };
    evaluator = new ScheduleEvaluator(evaluatorConfig);

    const populationConfig: PopulationConfig = {
      size: 50,
      elitismCount: 5,
      tournamentSize: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8
    };

    geneticOptimizer = new GeneticOptimizer(
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

  // Helper function to create test classes
  const createTestClasses = (count: number): Array<{
    id: string;
    classNumber: string;
    name: string;
    grade: GradeLevel;
    defaultConflicts: Array<{ dayOfWeek: number; period: number }>;
    active: boolean;
    conflicts: Array<{ dayOfWeek: number; period: number }>;
    dayOfWeek: number | undefined;
    period: number | undefined;
  }> => {
    if (count > 50) {
      throw new Error('Cannot create more than 50 classes');
    }

    const grades: GradeLevel[] = ['Pre-K', 'K', '1', '2', '3', '4', '5'];
    return Array(count).fill(null).map((_, index) => ({
      id: `class_${index + 1}`,
      classNumber: `C${String(index + 1).padStart(3, '0')}`,
      name: `Test Class ${index + 1}`,
      grade: grades[index % grades.length],
      defaultConflicts: [],
      active: true,
      conflicts: [],
      dayOfWeek: undefined,
      period: undefined
    }));
  };

  describe('End-to-end Evolution Process', () => {
    it('should generate valid schedule for small dataset (10-15 classes)', async () => {
      const classes = createTestClasses(12);
      const result = await scheduler.generateSchedule(classes);

      expect(result.schedule).toBeDefined();
      expect(result.schedule.vertices.size).toBe(12);
      expect(result.metrics.distributionScore).toBeGreaterThan(0.7);
      expect(result.metrics.gapScore).toBeGreaterThan(0.7);
      expect(result.success).toBe(true);
    });

    it('should generate valid schedule for medium dataset (25-30 classes)', async () => {
      const classes = createTestClasses(28);
      const result = await scheduler.generateSchedule(classes);

      expect(result.schedule).toBeDefined();
      expect(result.schedule.vertices.size).toBe(28);
      expect(result.metrics.distributionScore).toBeGreaterThan(0.6);
      expect(result.metrics.gapScore).toBeGreaterThan(0.6);
      expect(result.success).toBe(true);
    });

    it('should generate valid schedule for maximum load (45-50 classes)', async () => {
      const classes = createTestClasses(48);
      const result = await scheduler.generateSchedule(classes);

      expect(result.schedule).toBeDefined();
      expect(result.schedule.vertices.size).toBe(48);
      expect(result.metrics.distributionScore).toBeGreaterThan(0.5);
      expect(result.metrics.gapScore).toBeGreaterThan(0.5);
      expect(result.success).toBe(true);
    });

    it('should handle class conflicts', async () => {
      const classes = createTestClasses(15).map(c => ({
        ...c,
        conflicts: [
          { dayOfWeek: 1, period: 1 },
          { dayOfWeek: 1, period: 2 }
        ]
      }));
      
      const result = await scheduler.generateSchedule(classes);

      expect(result.success).toBe(true);
      // Check that no classes are scheduled in conflicted periods
      for (const [, slot] of result.schedule.colors) {
        const conflictedClasses = classes.filter(c => 
          c.conflicts.some(conflict => 
            conflict.dayOfWeek === slot.dayOfWeek && 
            conflict.period === slot.period
          )
        );
        expect(conflictedClasses.length).toBe(0);
      }
    });
  });

  describe('Schedule Quality Metrics', () => {
    it('should maintain good distribution across days', async () => {
      const classes = createTestClasses(20);
      const result = await scheduler.generateSchedule(classes);

      expect(result.metrics.distributionScore).toBeGreaterThan(0.7);
      
      // Check actual distribution
      const dayCount = new Map<number, number>();
      for (const [, slot] of result.schedule.colors) {
        dayCount.set(slot.dayOfWeek, (dayCount.get(slot.dayOfWeek) || 0) + 1);
      }

      const counts = Array.from(dayCount.values());
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
      const maxDeviation = Math.max(...counts.map(c => Math.abs(c - avgCount)));
      
      expect(maxDeviation / avgCount).toBeLessThan(0.3); // Max 30% deviation
    });

    it('should minimize gaps between classes', async () => {
      const classes = createTestClasses(25);
      const result = await scheduler.generateSchedule(classes);

      expect(result.metrics.gapScore).toBeGreaterThan(0.6);
      
      // Check for gaps
      const scheduleByDay = new Map<number, number[]>();
      for (const [, slot] of result.schedule.colors) {
        if (!scheduleByDay.has(slot.dayOfWeek)) {
          scheduleByDay.set(slot.dayOfWeek, []);
        }
        scheduleByDay.get(slot.dayOfWeek)!.push(slot.period);
      }

      // Calculate average gap size
      let totalGaps = 0;
      let gapCount = 0;
      for (const periods of scheduleByDay.values()) {
        periods.sort((a, b) => a - b);
        for (let i = 1; i < periods.length; i++) {
          const gap = periods[i] - periods[i-1] - 1;
          if (gap > 0) {
            totalGaps += gap;
            gapCount++;
          }
        }
      }
      
      const avgGapSize = gapCount > 0 ? totalGaps / gapCount : 0;
      expect(avgGapSize).toBeLessThan(2);
    });
  });

  describe('Cache Integration', () => {
    it('should effectively use cache for repeated patterns', async () => {
      const classes = createTestClasses(15);
      
      // First run to populate cache
      await scheduler.generateSchedule(classes);
      
      // Second run should use cache
      const startTime = Date.now();
      const result = await scheduler.generateSchedule(classes);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should be significantly faster
    });

    it('should maintain cache size within limits', async () => {
      // Generate multiple different schedules
      for (let i = 0; i < 10; i++) {
        const classes = createTestClasses(15 + i);
        await scheduler.generateSchedule(classes);
      }
      
      // Check cache entries
      const cacheStats = await scheduleCache.getStats();
      expect(cacheStats.size).toBeLessThan(1000); // Adjust based on your cache limit
    });
  });
}); 