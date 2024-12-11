# Hybrid Scheduler Implementation Plan

> **Note**: For current implementation progress and status updates, please refer to [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).

## Overview
This document outlines the implementation plan for transitioning to a hybrid scheduling approach that combines graph coloring, constraint satisfaction, and genetic algorithms. This new approach aims to improve scheduling efficiency, solution quality, and system scalability.

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)

#### 1. New Core Services Structure
```typescript
// backend/src/services/scheduler/core/
├── GraphColoringService.ts      // Core graph-based scheduler
├── ConstraintSolver.ts         // CSP implementation
├── GeneticOptimizer.ts        // Genetic algorithm optimizer
└── types/
    ├── Graph.ts               // Graph structure types
    ├── Constraints.ts         // Enhanced constraint types
    └── GeneticTypes.ts        // Genetic algorithm types
```

#### 2. Graph Coloring Implementation
```typescript
interface ScheduleGraph {
  vertices: Map<string, ClassNode>;
  edges: Map<string, Set<string>>;
  colors: Map<string, TimeSlot>;
}

class GraphColoringService {
  buildGraph(classes: Class[]): ScheduleGraph {
    // Convert classes and conflicts to graph structure
  }

  colorGraph(graph: ScheduleGraph): Map<string, TimeSlot> {
    // Implement DSatur algorithm for graph coloring
    // DSatur is specifically good for scheduling
  }

  validateColoring(graph: ScheduleGraph): boolean {
    // Verify no adjacent vertices share colors
  }
}
```

#### 3. Constraint Solver Integration
```typescript
class ConstraintSolver {
  private solver: Z3Solver;  // Using Z3 for constraint solving

  defineConstraints(
    schedule: ScheduleGraph,
    constraints: ScheduleConstraints
  ): void {
    // Define hard constraints (must be met)
    // Define soft constraints (preferences)
  }

  propagateConstraints(): boolean {
    // Run constraint propagation
    // Return whether solution is feasible
  }
}
```

### Phase 2: Genetic Algorithm Layer (2 weeks)

#### 1. Genetic Algorithm Components
```typescript
interface Chromosome {
  schedule: ScheduleGraph;
  fitness: number;
}

class GeneticOptimizer {
  private population: Chromosome[];
  
  initializePopulation(
    baseSchedule: ScheduleGraph,
    size: number
  ): void {
    // Create initial population variations
  }

  evolve(generations: number): ScheduleGraph {
    // Run genetic algorithm
    // Use tournament selection
    // Implement crossover and mutation
  }

  evaluateFitness(chromosome: Chromosome): number {
    // Calculate weighted fitness score
    // Consider all optimization metrics
  }
}
```

#### 2. Optimization Metrics
```typescript
class ScheduleEvaluator {
  evaluateDistribution(schedule: ScheduleGraph): number;
  evaluateGaps(schedule: ScheduleGraph): number;
  evaluateResourceUtilization(schedule: ScheduleGraph): number;
  evaluateTeacherPreferences(schedule: ScheduleGraph): number;
}
```

### Phase 3: Integration Layer (2 weeks)

#### 1. Hybrid Scheduler Service
```typescript
class HybridSchedulerService {
  private graphColoring: GraphColoringService;
  private constraintSolver: ConstraintSolver;
  private geneticOptimizer: GeneticOptimizer;

  async generateSchedule(
    classes: Class[],
    constraints: ScheduleConstraints
  ): Promise<Schedule> {
    // 1. Create initial graph
    const graph = this.graphColoring.buildGraph(classes);

    // 2. Apply basic coloring
    const initialColoring = this.graphColoring.colorGraph(graph);

    // 3. Apply constraints
    const feasible = this.constraintSolver.propagateConstraints(
      graph,
      constraints
    );

    if (!feasible) {
      throw new Error('No feasible schedule exists');
    }

    // 4. Optimize using genetic algorithm
    const optimizedSchedule = this.geneticOptimizer.evolve(
      graph,
      GENERATION_COUNT
    );

    return this.convertToSchedule(optimizedSchedule);
  }
}
```

#### 2. API Integration
```typescript
// backend/src/api/routes/schedule.ts

router.post('/generate', async (req, res) => {
  const scheduler = new HybridSchedulerService();
  
  try {
    const schedule = await scheduler.generateSchedule(
      req.body.classes,
      req.body.constraints
    );
    
    // Store schedule and return response
    res.json({ schedule, metrics: schedule.metrics });
  } catch (error) {
    // Error handling
  }
});
```

### Phase 4: Performance Optimization (1-2 weeks)

#### 1. Parallel Processing
```typescript
class ParallelGeneticOptimizer extends GeneticOptimizer {
  async evolveParallel(
    generations: number,
    threadCount: number
  ): Promise<ScheduleGraph> {
    // Distribute population across worker threads
    // Merge results periodically
  }
}
```

#### 2. Caching Layer
```typescript
class ScheduleCache {
  private cache: LRUCache<string, ScheduleGraph>;

  cacheSubgraph(key: string, subgraph: ScheduleGraph): void;
  retrieveSubgraph(key: string): ScheduleGraph | null;
}
```

### Phase 5: Testing and Validation (2 weeks)

#### 1. Test Suite Structure
```typescript
// backend/src/services/scheduler/__tests__/
├── graphColoring.test.ts
├── constraintSolver.test.ts
├── geneticOptimizer.test.ts
└── integration.test.ts
```

#### 2. Performance Benchmarks
```typescript
class SchedulerBenchmark {
  async runBenchmarks(): Promise<BenchmarkResults> {
    // Test with various dataset sizes
    // Measure time and memory usage
    // Compare with old implementation
  }
}
```

## Migration Strategy

### 1. Gradual Rollout (1 week)
- Implement feature flags for new system
- Run both systems in parallel initially
- Compare results for validation

### 2. Data Migration (1 week)
- Convert existing schedules to new format
- Preserve historical data
- Update database schemas if needed

## Timeline
Total estimated implementation time: 11-13 weeks

## Benefits
1. More mathematically sound approach
2. Better handling of complex constraints
3. Improved optimization capabilities
4. Better performance for large datasets
5. More maintainable and modular code
6. Easier to extend with new features

## Dependencies
- Z3 Solver for constraint satisfaction
- Worker Threads for parallel processing
- LRU Cache implementation
- Updated TypeScript version for advanced type features

## Monitoring and Metrics
- Performance metrics for each component
- Comparison metrics between old and new system
- Success rate metrics for schedule generation
- Optimization quality metrics

## Rollback Plan
- Maintain old system during transition
- Keep database compatible with both systems
- Document rollback procedures
- Monitor system health metrics

## Future Considerations
1. Additional optimization strategies
2. Enhanced constraint types
3. Machine learning integration
4. Real-time schedule adjustments
5. Advanced visualization tools