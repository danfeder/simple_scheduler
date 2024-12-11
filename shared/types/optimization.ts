import { Schedule } from './schedule';
import { ScheduleEntry } from './schedule';
import { ScheduleQuality } from './schedule';

export interface OptimizationConfig {
    populationSize: number;
    generationLimit: number;
    mutationRate: number;
    crossoverRate: number;
    elitismCount: number;
    tournamentSize: number;
    weights: {
        dayDistribution: number;
        timeGaps: number;
        periodUtilization: number;
        weekDistribution: number;
        constraintSatisfaction: number;
    };
}

export interface OptimizationProgress {
    generation: number;
    bestFitness: number;
    averageFitness: number;
    worstFitness: number;
    timeElapsed: number;
    improvementCount: number;
    bestSchedule?: Schedule;
}

export interface OptimizationResult {
    success: boolean;
    schedule?: Schedule;
    quality: ScheduleQuality;
    metrics: {
        generations: number;
        timeElapsed: number;
        improvementCount: number;
        finalPopulationSize: number;
        averageFitness: number;
    };
    error?: string;
}

export interface GeneticOperators {
    mutate: (schedule: Schedule, rate: number) => Schedule;
    crossover: (parent1: Schedule, parent2: Schedule, rate: number) => [Schedule, Schedule];
    select: (population: Schedule[], count: number) => Schedule[];
}

export interface FitnessFunction {
    (schedule: Schedule): number;
    weights?: OptimizationConfig['weights'];
} 