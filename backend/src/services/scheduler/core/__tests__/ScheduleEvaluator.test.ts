import { ScheduleEvaluator, EvaluatorConfig } from '../ScheduleEvaluator';
import type { ScheduleGraph, TimeSlot, ClassNode } from '../types/Graph';
import type { GradeLevel } from '../types/base';

describe('ScheduleEvaluator', () => {
  let evaluator: ScheduleEvaluator;
  let defaultConfig: EvaluatorConfig;

  beforeEach(() => {
    defaultConfig = {
      maxGapSize: 2,
      minDailyClasses: 4,
      maxDailyClasses: 8,
      targetClassesPerDay: 6,
      weightDistribution: 0.4,
      weightGaps: 0.3,
      weightContinuousBlocks: 0.3
    };
    evaluator = new ScheduleEvaluator(defaultConfig);
  });

  // Helper function to create a basic schedule graph
  const createScheduleGraph = (
    vertices: Map<string, ClassNode>,
    colors: Map<string, TimeSlot>
  ): ScheduleGraph => ({
    vertices,
    edges: new Map(),
    colors
  });

  // Helper function to create a ClassNode
  const createClassNode = (id: string, name: string, grade: GradeLevel): ClassNode => ({
    id,
    name,
    constraints: new Set<string>(),
    saturationDegree: 0,
    adjacentNodes: new Set<string>(),
    availableSlots: new Set<string>()
  });

  describe('Class Distribution Scoring', () => {
    it('should return perfect score for evenly distributed classes', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Add target number of classes per day (Mon-Fri)
      for (let day = 1; day <= 5; day++) {
        for (let period = 1; period <= defaultConfig.targetClassesPerDay; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '3'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.distributionScore).toBeCloseTo(1.0, 2);
    });

    it('should penalize uneven class distribution', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Add 8 classes on Monday, 4 classes on other days
      for (let day = 1; day <= 5; day++) {
        const classCount = day === 1 ? 8 : 4;
        for (let period = 1; period <= classCount; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '2'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.distributionScore).toBeLessThan(0.7);
    });

    it('should handle empty schedule', () => {
      const schedule = createScheduleGraph(new Map(), new Map());
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.distributionScore).toBeDefined();
      expect(metrics.distributionScore).toBeGreaterThanOrEqual(0);
      expect(metrics.distributionScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Gap Analysis', () => {
    it('should give high score for schedules with minimal gaps', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Add continuous blocks of classes
      for (let day = 1; day <= 5; day++) {
        for (let period = 1; period <= 4; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '1'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.gapScore).toBeGreaterThan(0.9);
    });

    it('should penalize schedules with large gaps', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Add classes with gaps
      for (let day = 1; day <= 5; day++) {
        // Morning classes
        for (let period = 1; period <= 2; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, 'K'));
          colors.set(classId, { dayOfWeek: day, period });
        }
        // Afternoon classes with large gap
        for (let period = 6; period <= 7; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, 'K'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.gapScore).toBeLessThan(0.6);
    });
  });

  describe('Continuous Blocks Analysis', () => {
    it('should give optimal score for balanced continuous blocks', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Create a schedule with ~70% of classes in continuous blocks
      for (let day = 1; day <= 5; day++) {
        // Morning block (3 continuous classes)
        for (let period = 1; period <= 3; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '4'));
          colors.set(classId, { dayOfWeek: day, period });
        }
        // Afternoon scattered classes
        colors.set(`class_${day}_5`, { dayOfWeek: day, period: 5 });
        colors.set(`class_${day}_7`, { dayOfWeek: day, period: 7 });
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.continuousBlockScore).toBeGreaterThan(0.9);
    });

    it('should penalize schedules with too many scattered classes', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Create a schedule with mostly scattered classes
      for (let day = 1; day <= 5; day++) {
        for (let period of [1, 3, 5, 7]) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '5'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      expect(metrics.continuousBlockScore).toBeLessThan(0.6);
    });
  });

  describe('Total Score Calculation', () => {
    it('should calculate weighted total score correctly', () => {
      const vertices = new Map<string, ClassNode>();
      const colors = new Map<string, TimeSlot>();
      
      // Create a balanced schedule
      for (let day = 1; day <= 5; day++) {
        // Morning block
        for (let period = 1; period <= 3; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '3'));
          colors.set(classId, { dayOfWeek: day, period });
        }
        // Afternoon block
        for (let period = 5; period <= 7; period++) {
          const classId = `class_${day}_${period}`;
          vertices.set(classId, createClassNode(classId, `Class ${day}-${period}`, '3'));
          colors.set(classId, { dayOfWeek: day, period });
        }
      }

      const schedule = createScheduleGraph(vertices, colors);
      const metrics = evaluator.evaluateSchedule(schedule);
      
      // All individual scores should be high
      expect(metrics.distributionScore).toBeGreaterThan(0.8);
      expect(metrics.gapScore).toBeGreaterThan(0.8);
      expect(metrics.continuousBlockScore).toBeGreaterThan(0.8);
      
      // Total score should be weighted average
      const expectedTotal = (
        metrics.distributionScore * defaultConfig.weightDistribution +
        metrics.gapScore * defaultConfig.weightGaps +
        metrics.continuousBlockScore * defaultConfig.weightContinuousBlocks
      ) / (defaultConfig.weightDistribution + defaultConfig.weightGaps + defaultConfig.weightContinuousBlocks);
      
      expect(metrics.totalScore).toBeCloseTo(expectedTotal, 5);
    });
  });
}); 