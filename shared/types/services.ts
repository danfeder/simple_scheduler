import { ScheduleGraph, ColoringResult } from './graph';
import { 
    Schedule, 
    ScheduleConstraints, 
    ScheduledClass,
    ScheduleQuality,
    ScheduleEntry 
} from './schedule';
import { Class } from './class';
import { OptimizationResult } from './optimization';

export interface IGraphColoringService {
    colorGraph(graph: ScheduleGraph, constraints: ScheduleConstraints): Promise<ColoringResult>;
    validateColoring(graph: ScheduleGraph, coloring: Map<string, number>): boolean;
    buildScheduleGraph(classes: Class[]): ScheduleGraph;
}

export interface IScheduleEvaluator {
    evaluateSchedule(schedule: Schedule): ScheduleQuality;
    validateConstraints(schedule: Schedule, constraints: ScheduleConstraints): boolean;
    calculateDayDistribution(schedule: Schedule): number;
    calculateTimeGaps(schedule: Schedule): number;
    calculatePeriodUtilization(schedule: Schedule): number;
}

export interface IParallelScheduler {
    initialize(numWorkers?: number): Promise<void>;
    scheduleInParallel(
        graph: ScheduleGraph, 
        constraints: ScheduleConstraints
    ): Promise<ColoringResult>;
    shutdown(): Promise<void>;
}

export interface IScheduleCache {
    getCachedSchedule(key: string): Promise<Schedule | null>;
    cacheSchedule(key: string, schedule: Schedule): Promise<void>;
    invalidateSchedule(key: string): Promise<void>;
    getCachedColoring(graphHash: string): Promise<ColoringResult | null>;
    cacheColoring(graphHash: string, result: ColoringResult): Promise<void>;
}

export interface IGeneticOptimizer {
    initialize(population: Schedule[]): void;
    evolve(generations: number): Promise<OptimizationResult>;
    mutateSchedule(schedule: Schedule): Schedule;
    crossoverSchedules(schedule1: Schedule, schedule2: Schedule): Schedule[];
    evaluateFitness(schedule: Schedule): number;
}

// Main scheduler service that orchestrates all other services
export interface ISchedulerService {
    initialize(classes: Class[]): Promise<void>;
    generateSchedule(constraints: ScheduleConstraints): Promise<Schedule>;
    evaluateSchedule(schedule: Schedule): Promise<ScheduleQuality>;
    optimizeSchedule(schedule: Schedule, generations?: number): Promise<OptimizationResult>;
    validateSchedule(schedule: Schedule, constraints: ScheduleConstraints): boolean;
    getScheduleEntries(): ScheduleEntry[];
} 