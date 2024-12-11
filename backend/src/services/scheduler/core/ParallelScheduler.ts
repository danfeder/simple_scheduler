import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { ScheduleGraph, ColoringResult } from './types/Graph';
import { GraphColoringService } from './GraphColoringService';
import { ScheduledClass, ScheduleConstraints } from '../types';
import os from 'os';

interface WorkerTask {
    subgraph: ScheduleGraph;
    constraints: ScheduleConstraints;
}

interface WorkerResult {
    success: boolean;
    coloring?: Map<string, { dayOfWeek: number; period: number }>;
    error?: string;
}

export class ParallelScheduler {
    private threadCount: number;
    private workers: Worker[];
    private constraints: ScheduleConstraints;
    private workerPool: Worker[] = [];
    private readonly maxThreads: number;

    constructor(constraints: ScheduleConstraints, threadCount?: number) {
        this.constraints = constraints;
        this.threadCount = threadCount || Math.max(1, os.cpus().length - 1);
        this.workers = [];
        this.maxThreads = threadCount || 4;
    }

    public async scheduleParallel(classes: ScheduledClass[]): Promise<ColoringResult> {
        const service = new GraphColoringService(this.constraints);
        const graph = service.buildGraph(classes);
        
        // Partition the graph into subgraphs
        const subgraphs = this.partitionGraph(graph);
        
        try {
            // Process subgraphs in parallel
            const results = await this.processSubgraphsParallel(subgraphs);
            
            // Merge results
            return this.mergeResults(results, graph);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error in parallel processing'
            };
        }
    }

    private partitionGraph(graph: ScheduleGraph): ScheduleGraph[] {
        const subgraphs: ScheduleGraph[] = [];
        const verticesPerSubgraph = Math.ceil(graph.vertices.size / this.threadCount);
        
        let currentSubgraph: ScheduleGraph = {
            vertices: new Map(),
            edges: new Map(),
            colors: new Map()
        };
        
        let count = 0;
        
        // Partition vertices and their edges
        for (const [vertexId, vertex] of graph.vertices) {
            currentSubgraph.vertices.set(vertexId, { ...vertex });
            currentSubgraph.edges.set(vertexId, new Set(graph.edges.get(vertexId)));
            
            count++;
            
            if (count >= verticesPerSubgraph) {
                subgraphs.push(currentSubgraph);
                currentSubgraph = {
                    vertices: new Map(),
                    edges: new Map(),
                    colors: new Map()
                };
                count = 0;
            }
        }
        
        // Add the last subgraph if it has any vertices
        if (currentSubgraph.vertices.size > 0) {
            subgraphs.push(currentSubgraph);
        }
        
        return subgraphs;
    }

    private async processSubgraphsParallel(subgraphs: ScheduleGraph[]): Promise<WorkerResult[]> {
        const tasks = subgraphs.map(subgraph => ({
            subgraph,
            constraints: this.constraints
        }));
        
        // Initialize worker pool
        const workers = await Promise.all(
            Array(this.threadCount).fill(null).map(() => this.createWorker())
        );
        
        // Process tasks
        const results = await Promise.all(
            tasks.map(task => this.runWorkerTask(workers, task))
        );
        
        // Cleanup workers
        await Promise.all(workers.map(worker => worker.terminate()));
        
        return results;
    }

    private createWorker(): Promise<Worker> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: { type: 'worker' }
            });
            
            worker.on('error', reject);
            worker.on('online', () => resolve(worker));
        });
    }

    private async runWorkerTask(workers: Worker[], task: WorkerTask): Promise<WorkerResult> {
        return new Promise((resolve, reject) => {
            const worker = workers.find(w => !w.listenerCount('message'));
            
            if (!worker) {
                reject(new Error('No available workers'));
                return;
            }
            
            worker.once('message', resolve);
            worker.once('error', reject);
            worker.postMessage(task);
        });
    }

    private mergeResults(results: WorkerResult[], originalGraph: ScheduleGraph): ColoringResult {
        // Check if any subgraph processing failed
        const failedResult = results.find(r => !r.success);
        if (failedResult) {
            return {
                success: false,
                error: failedResult.error || 'Failed to process one or more subgraphs'
            };
        }
        
        // Merge all colorings
        const mergedColoring = new Map<string, { dayOfWeek: number; period: number }>();
        
        for (const result of results) {
            if (result.coloring) {
                for (const [vertexId, color] of result.coloring) {
                    mergedColoring.set(vertexId, color);
                }
            }
        }
        
        // Validate the merged result
        const service = new GraphColoringService(this.constraints);
        originalGraph.colors = mergedColoring;
        const validation = service.validateColoring(originalGraph);
        
        if (validation.conflicts.length > 0) {
            return {
                success: false,
                error: 'Merged schedule contains conflicts'
            };
        }
        
        return {
            success: true,
            schedule: mergedColoring
        };
    }

    /**
     * Run an array of tasks in parallel using the worker pool
     * @param tasks Array of tasks to execute in parallel
     * @returns Array of task results
     */
    public async runTasks<T>(tasks: Promise<T>[]): Promise<T[]> {
        if (tasks.length === 0) return [];

        // For small number of tasks, run directly without worker overhead
        if (tasks.length <= 2) {
            return Promise.all(tasks);
        }

        // Split tasks into batches based on thread count
        const batchSize = Math.ceil(tasks.length / this.maxThreads);
        const batches: Promise<T>[][] = [];
        
        for (let i = 0; i < tasks.length; i += batchSize) {
            batches.push(tasks.slice(i, i + batchSize));
        }

        // Process batches in parallel
        const batchResults = await Promise.all(
            batches.map(batch => this.processBatch(batch))
        );

        // Flatten results
        return batchResults.flat();
    }

    /**
     * Process a batch of tasks
     * @param batch Array of tasks to process
     * @returns Array of task results
     */
    private async processBatch<T>(batch: Promise<T>[]): Promise<T[]> {
        try {
            return await Promise.all(batch);
        } catch (error) {
            console.error('Error processing batch:', error);
            throw error;
        }
    }

    /**
     * Clean up worker threads
     */
    public dispose(): void {
        this.workerPool.forEach(worker => worker.terminate());
        this.workerPool = [];
    }
}

// Worker thread code
if (!isMainThread) {
    parentPort?.on('message', (task: WorkerTask) => {
        const service = new GraphColoringService(task.constraints);
        const result = service.colorGraph(task.subgraph);
        parentPort?.postMessage(result);
    });
} 