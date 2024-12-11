import { GeneticOptimizer } from '../GeneticOptimizer';
import { GraphColoringService } from '../GraphColoringService';
import { ParallelScheduler } from '../ParallelScheduler';
import { ScheduleCache } from '../ScheduleCache';
import { ScheduleEvaluator } from '../ScheduleEvaluator';
import { ScheduleGraph, TimeSlot, ClassNode } from '../types/Graph';
import { PopulationConfig, Chromosome } from '../types/GeneticTypes';
import type { GradeLevel } from '../types/base';

describe('GeneticOptimizer', () => {
  let optimizer: GeneticOptimizer;
  let graphColoring: jest.Mocked<GraphColoringService>;
  let parallelScheduler: jest.Mocked<ParallelScheduler>;
  let scheduleCache: jest.Mocked<ScheduleCache>;
  let evaluator: jest.Mocked<ScheduleEvaluator>;
  let defaultConfig: PopulationConfig;

  beforeEach(() => {
    // Create mock implementations
    graphColoring = {
      colorGraphWithRandomization: jest.fn().mockImplementation(async (schedule: ScheduleGraph): Promise<ScheduleGraph> => schedule),
      repairColoring: jest.fn().mockImplementation(async (schedule: ScheduleGraph): Promise<ScheduleGraph> => schedule)
    } as unknown as jest.Mocked<GraphColoringService>;

    parallelScheduler = {
      runTasks: jest.fn().mockImplementation(async <T>(tasks: Array<() => Promise<T>>): Promise<T[]> => Promise.all(tasks.map(t => t())))
    } as unknown as jest.Mocked<ParallelScheduler>;

    scheduleCache = {
      retrieveSubgraph: jest.fn().mockReturnValue(null),
      cacheSubgraph: jest.fn()
    } as unknown as jest.Mocked<ScheduleCache>;

    evaluator = {
      evaluateSchedule: jest.fn()
    } as unknown as jest.Mocked<ScheduleEvaluator>;

    defaultConfig = {
      size: 50,
      elitismCount: 5,
      tournamentSize: 5,
      crossoverRate: 0.8,
      mutationRate: 0.1
    };

    optimizer = new GeneticOptimizer(
      graphColoring,
      parallelScheduler,
      scheduleCache,
      evaluator,
      defaultConfig
    );
  });

  // Helper function to create a test schedule
  const createTestSchedule = (): ScheduleGraph => {
    const vertices = new Map<string, ClassNode>();
    const edges = new Map<string, Set<string>>();
    const colors = new Map<string, TimeSlot>();

    // Add test classes
    for (let i = 1; i <= 10; i++) {
      const classId = `class_${i}`;
      vertices.set(classId, {
        id: classId,
        name: `Test Class ${i}`,
        constraints: new Set<string>(),
        saturationDegree: 0,
        adjacentNodes: new Set<string>(),
        availableSlots: new Set<string>()
      });

      colors.set(classId, {
        dayOfWeek: Math.ceil(i / 2),
        period: ((i - 1) % 2) + 1
      });
    }

    return { vertices, edges, colors };
  };

  describe('Population Initialization', () => {
    it('should initialize population with correct size', async () => {
      const baseSchedule = createTestSchedule();
      const mockVariations: ScheduleGraph[] = Array(defaultConfig.size).fill(null).map(() => ({
        ...baseSchedule,
        colors: new Map(baseSchedule.colors)
      }));

      graphColoring.colorGraphWithRandomization.mockResolvedValue(baseSchedule);
      parallelScheduler.runTasks.mockResolvedValue(
        mockVariations.map(schedule => ({
          schedule,
          fitness: 0,
          generation: 0
        }))
      );

      evaluator.evaluateSchedule.mockReturnValue({
        distributionScore: 0.8,
        gapScore: 0.7,
        continuousBlockScore: 0.9,
        totalScore: 0.8
      });

      await optimizer.initializePopulation(baseSchedule);

      expect(parallelScheduler.runTasks).toHaveBeenCalledTimes(1);
      const tasks = parallelScheduler.runTasks.mock.calls[0][0];
      expect(tasks).toHaveLength(defaultConfig.size);
    });

    it('should use cache when available', async () => {
      const baseSchedule = createTestSchedule();
      const cachedSchedule: ScheduleGraph = { ...baseSchedule, colors: new Map(baseSchedule.colors) };
      
      scheduleCache.retrieveSubgraph.mockReturnValue(cachedSchedule);
      parallelScheduler.runTasks.mockResolvedValue(
        Array(defaultConfig.size).fill(null).map(() => ({
          schedule: cachedSchedule,
          fitness: 0,
          generation: 0
        }))
      );

      await optimizer.initializePopulation(baseSchedule);

      expect(scheduleCache.retrieveSubgraph).toHaveBeenCalled();
      expect(graphColoring.colorGraphWithRandomization).not.toHaveBeenCalled();
    });
  });

  describe('Evolution Operations', () => {
    let initialPopulation: Chromosome[];

    beforeEach(async () => {
      const baseSchedule = createTestSchedule();
      initialPopulation = Array(defaultConfig.size).fill(null).map((_, index) => ({
        schedule: baseSchedule,
        fitness: 0.5 + (index / defaultConfig.size / 2), // Varying fitness values
        generation: 0
      }));

      graphColoring.colorGraphWithRandomization.mockResolvedValue(baseSchedule);
      parallelScheduler.runTasks
        .mockResolvedValueOnce(initialPopulation) // For initialization
        .mockResolvedValue(initialPopulation.map(c => ({ ...c, generation: 1 }))); // For evolution

      evaluator.evaluateSchedule.mockReturnValue({
        distributionScore: 0.8,
        gapScore: 0.7,
        continuousBlockScore: 0.9,
        totalScore: 0.8
      });

      await optimizer.initializePopulation(baseSchedule);
    });

    it('should evolve population for specified generations', async () => {
      const generations = 5;
      const result = await optimizer.evolve(generations);

      expect(result.generationCount).toBeLessThanOrEqual(generations);
      expect(result.fitnessHistory).toBeDefined();
      expect(result.bestSchedule).toBeDefined();
      expect(result.finalFitnessMetrics).toBeDefined();
    });

    it('should preserve elite chromosomes', async () => {
      const result = await optimizer.evolve(1);
      
      expect(result.bestSchedule).toBeDefined();
      expect(result.finalFitnessMetrics).toBeDefined();
      expect(parallelScheduler.runTasks).toHaveBeenCalled();
    });

    it('should track fitness history', async () => {
      const generations = 3;
      const result = await optimizer.evolve(generations);

      expect(result.fitnessHistory).toBeDefined();
      expect(result.fitnessHistory.length).toBeGreaterThan(0);
      expect(Math.max(...result.fitnessHistory)).toBeGreaterThan(0);
    });

    it('should stop early if fitness is high enough', async () => {
      evaluator.evaluateSchedule.mockReturnValue({
        distributionScore: 0.98,
        gapScore: 0.99,
        continuousBlockScore: 0.97,
        totalScore: 0.98
      });

      const result = await optimizer.evolve(100);

      expect(result.generationCount).toBeLessThan(100);
      expect(Math.max(...result.fitnessHistory)).toBeGreaterThan(0.95);
    });
  });

  describe('Crossover and Mutation', () => {
    let baseSchedule: ScheduleGraph;

    beforeEach(async () => {
      baseSchedule = createTestSchedule();
      graphColoring.colorGraphWithRandomization.mockResolvedValue(baseSchedule);
      graphColoring.repairColoring.mockImplementation(schedule => schedule);
      
      parallelScheduler.runTasks.mockResolvedValue(
        Array(defaultConfig.size).fill(null).map(() => ({
          schedule: baseSchedule,
          fitness: 0.5,
          generation: 0
        }))
      );

      evaluator.evaluateSchedule.mockReturnValue({
        distributionScore: 0.8,
        gapScore: 0.7,
        continuousBlockScore: 0.9,
        totalScore: 0.8
      });

      await optimizer.initializePopulation(baseSchedule);
    });

    it('should perform crossover based on rate', async () => {
      const result = await optimizer.evolve(1);
      expect(result.bestSchedule).toBeDefined();
      expect(graphColoring.repairColoring).toHaveBeenCalled();
    });

    it('should perform mutation based on rate', async () => {
      const result = await optimizer.evolve(1);
      expect(result.bestSchedule).toBeDefined();
      expect(graphColoring.repairColoring).toHaveBeenCalled();
    });

    it('should repair invalid schedules after genetic operations', async () => {
      const result = await optimizer.evolve(1);
      expect(graphColoring.repairColoring).toHaveBeenCalled();
      expect(result.bestSchedule).toBeDefined();
    });
  });

  describe('Cache Integration', () => {
    it('should cache generated schedule variations', async () => {
      const baseSchedule = createTestSchedule();
      graphColoring.colorGraphWithRandomization.mockResolvedValue(baseSchedule);
      
      await optimizer.initializePopulation(baseSchedule);
      
      expect(scheduleCache.cacheSubgraph).toHaveBeenCalled();
    });

    it('should use cached schedules when available', async () => {
      const baseSchedule = createTestSchedule();
      const cachedSchedule = { ...baseSchedule };
      
      scheduleCache.retrieveSubgraph.mockReturnValue(cachedSchedule);
      
      await optimizer.initializePopulation(baseSchedule);
      
      expect(graphColoring.colorGraphWithRandomization).not.toHaveBeenCalled();
      expect(scheduleCache.retrieveSubgraph).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should use parallel processing for population evaluation', async () => {
      const baseSchedule = createTestSchedule();
      await optimizer.initializePopulation(baseSchedule);
      await optimizer.evolve(1);
      
      expect(parallelScheduler.runTasks).toHaveBeenCalled();
    });

    it('should handle early stopping when fitness plateaus', async () => {
      evaluator.evaluateSchedule.mockReturnValue({
        distributionScore: 0.95,
        gapScore: 0.95,
        continuousBlockScore: 0.95,
        totalScore: 0.95
      });

      const result = await optimizer.evolve(100);
      
      expect(result.generationCount).toBeLessThan(100);
      expect(result.fitnessHistory[result.fitnessHistory.length - 1]).toBeGreaterThan(0.9);
    });
  });
}); 