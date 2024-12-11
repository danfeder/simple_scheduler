import { GraphColoringService } from './GraphColoringService';
import { ParallelScheduler } from './ParallelScheduler';
import { ScheduleCache } from './ScheduleCache';
import { ScheduleGraph, TimeSlot } from './types/Graph';
import { Schedule, ScheduleQuality } from '../../../../shared/types/schedule';
import { OptimizationConfig, OptimizationResult } from '../../../../shared/types/optimization';
import { IGeneticOptimizer } from '../../../../shared/types/services';
import { ScheduleEvaluator } from './ScheduleEvaluator';

interface Chromosome {
  schedule: Schedule;
  fitness: number;
  generation: number;
}

export class GeneticOptimizer implements IGeneticOptimizer {
  private population: Chromosome[] = [];
  private bestChromosome: Chromosome | null = null;
  private fitnessHistory: number[] = [];
  private currentGeneration: number = 0;
  private config: OptimizationConfig;

  constructor(
    private graphColoring: GraphColoringService,
    private parallelScheduler: ParallelScheduler,
    private scheduleCache: ScheduleCache,
    private evaluator: ScheduleEvaluator,
    config?: Partial<OptimizationConfig>
  ) {
    this.config = {
      populationSize: 50,
      generationLimit: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismCount: 2,
      tournamentSize: 5,
      weights: {
        dayDistribution: 0.3,
        timeGaps: 0.3,
        periodUtilization: 0.2,
        weekDistribution: 0.1,
        constraintSatisfaction: 0.1
      },
      ...config
    };
  }

  public initialize(population: Schedule[]): void {
    this.population = population.map(schedule => ({
      schedule,
      fitness: this.evaluateFitness(schedule),
      generation: 0
    }));
    this.updateBestChromosome();
  }

  public async evolve(generations: number): Promise<OptimizationResult> {
    const startTime = Date.now();

    for (let gen = 0; gen < generations; gen++) {
      this.currentGeneration = gen;
      
      // Create next generation
      const offspring = await this.createNextGeneration();
      
      // Evaluate new chromosomes
      const evaluatedOffspring = await this.evaluateChromosomes(offspring);
      
      // Select survivors for next generation (elitism)
      this.population = this.selectSurvivors(evaluatedOffspring);
      
      // Update best solution found
      this.updateBestChromosome();
      
      // Optional: Early stopping if fitness hasn't improved
      if (this.shouldStopEarly()) {
        break;
      }
    }

    if (!this.bestChromosome) {
      return {
        success: false,
        error: "No valid schedule found",
        quality: {
          totalScore: 0,
          metrics: {
            dayDistribution: 0,
            timeGaps: 0,
            periodUtilization: 0
          }
        },
        metrics: {
          generations: this.currentGeneration + 1,
          timeElapsed: Date.now() - startTime,
          improvementCount: this.fitnessHistory.length,
          finalPopulationSize: this.population.length,
          averageFitness: this.population.reduce((sum, c) => sum + c.fitness, 0) / this.population.length
        }
      };
    }

    return {
      success: true,
      schedule: this.bestChromosome.schedule,
      quality: this.evaluator.evaluateSchedule(this.bestChromosome.schedule),
      metrics: {
        generations: this.currentGeneration + 1,
        timeElapsed: Date.now() - startTime,
        improvementCount: this.fitnessHistory.length,
        finalPopulationSize: this.population.length,
        averageFitness: this.population.reduce((sum, c) => sum + c.fitness, 0) / this.population.length
      }
    };
  }

  public mutateSchedule(schedule: Schedule): Schedule {
    const mutatedSchedule = { ...schedule };
    const numClasses = schedule.classes.length;
    const numMutations = Math.max(1, Math.floor(numClasses * this.config.mutationRate));
    
    for (let i = 0; i < numMutations; i++) {
      const classIdx = Math.floor(Math.random() * numClasses);
      const classToMutate = mutatedSchedule.classes[classIdx];
      
      // Randomly adjust the period by -1, 0, or 1
      const periodDelta = Math.floor(Math.random() * 3) - 1;
      let newPeriod = classToMutate.period + periodDelta;
      
      // Ensure period stays within bounds (1-8)
      newPeriod = Math.max(1, Math.min(8, newPeriod));
      
      // Update the class period
      mutatedSchedule.classes[classIdx] = {
        ...classToMutate,
        period: newPeriod
      };
    }
    
    return mutatedSchedule;
  }

  public crossoverSchedules(schedule1: Schedule, schedule2: Schedule): Schedule[] {
    // Create copies of the schedules
    const child1 = { ...schedule1 };
    const child2 = { ...schedule2 };
    
    // Perform crossover only if random number is below crossover rate
    if (Math.random() < this.config.crossoverRate) {
      const numClasses = schedule1.classes.length;
      const crossoverPoint = Math.floor(Math.random() * numClasses);
      
      // Swap classes after crossover point
      for (let i = crossoverPoint; i < numClasses; i++) {
        const temp = child1.classes[i];
        child1.classes[i] = child2.classes[i];
        child2.classes[i] = temp;
      }
    }
    
    return [child1, child2];
  }

  public evaluateFitness(schedule: Schedule): number {
    const quality = this.evaluator.evaluateSchedule(schedule);
    return quality.totalScore;
  }

  private async createNextGeneration(): Promise<Chromosome[]> {
    const offspring: Chromosome[] = [];
    const targetSize = this.config.populationSize - this.config.elitismCount;
    
    while (offspring.length < targetSize) {
      // Select parents through tournament selection
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      
      // Perform crossover
      const [child1, child2] = this.crossoverSchedules(parent1.schedule, parent2.schedule);
      
      // Perform mutation
      const mutated1 = this.mutateSchedule(child1);
      const mutated2 = this.mutateSchedule(child2);
      
      offspring.push(
        {
          schedule: mutated1,
          fitness: this.evaluateFitness(mutated1),
          generation: this.currentGeneration + 1
        },
        {
          schedule: mutated2,
          fitness: this.evaluateFitness(mutated2),
          generation: this.currentGeneration + 1
        }
      );
    }
    
    return offspring.slice(0, targetSize);
  }

  private tournamentSelection(): Chromosome {
    const tournament: Chromosome[] = [];
    
    // Randomly select chromosomes for tournament
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[idx]);
    }
    
    // Return the fittest from the tournament
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  private async evaluateChromosomes(chromosomes: Chromosome[]): Promise<Chromosome[]> {
    return chromosomes.map(chromosome => ({
      ...chromosome,
      fitness: this.evaluateFitness(chromosome.schedule)
    }));
  }

  private selectSurvivors(offspring: Chromosome[]): Chromosome[] {
    // Sort current population by fitness
    const sortedPopulation = [...this.population].sort((a, b) => b.fitness - a.fitness);
    
    // Keep the best individuals (elitism)
    const elites = sortedPopulation.slice(0, this.config.elitismCount);
    
    // Combine elites with offspring
    return [...elites, ...offspring];
  }

  private shouldStopEarly(): boolean {
    const recentHistorySize = 10;
    if (this.fitnessHistory.length < recentHistorySize) return false;
    
    const recentHistory = this.fitnessHistory.slice(-recentHistorySize);
    const improvement = Math.abs(recentHistory[recentHistory.length - 1] - recentHistory[0]);
    
    return improvement < 0.01; // Less than 1% improvement
  }

  private updateBestChromosome(): void {
    const currentBest = this.population.reduce((best, current) => 
      current.fitness > (best?.fitness ?? -Infinity) ? current : best
    , this.bestChromosome);
    
    if (currentBest && (!this.bestChromosome || currentBest.fitness > this.bestChromosome.fitness)) {
      this.bestChromosome = currentBest;
      this.fitnessHistory.push(currentBest.fitness);
    }
  }
} 