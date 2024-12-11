import { ScheduleGraph } from './Graph';

export interface Chromosome {
  schedule: ScheduleGraph;
  fitness: number;
  generation: number;
}

export interface PopulationConfig {
  size: number;
  elitismCount: number;
  tournamentSize: number;
  crossoverRate: number;
  mutationRate: number;
}

export interface FitnessMetrics {
  distributionScore: number;
  gapScore: number;
  continuousBlockScore: number;
  totalScore: number;
}

export interface GeneticOptimizationResult {
  bestSchedule: ScheduleGraph;
  fitnessHistory: number[];
  generationCount: number;
  finalFitnessMetrics: FitnessMetrics;
  executionTimeMs: number;
}