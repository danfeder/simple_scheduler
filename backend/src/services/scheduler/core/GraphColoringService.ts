import { ScheduledClass, ScheduleConstraints } from '../types';
import { ClassNode, TimeSlot, ScheduleGraph, ColoringResult, GraphValidationResult } from './types/Graph';

export class GraphColoringService {
    private readonly maxPeriods: number;
    private readonly daysPerWeek: number = 5; // Monday to Friday

    constructor(constraints: ScheduleConstraints) {
        this.maxPeriods = constraints.maxPeriodsPerDay;
    }

    public buildGraph(classes: ScheduledClass[]): ScheduleGraph {
        const graph: ScheduleGraph = {
            vertices: new Map(),
            edges: new Map(),
            colors: new Map()
        };

        // Create vertices with enhanced constraint handling
        classes.forEach(cls => {
            const node: ClassNode = {
                id: cls.id,
                name: cls.name,
                constraints: new Set(),
                saturationDegree: 0,
                adjacentNodes: new Set(),
                availableSlots: new Set()
            };

            // Initialize available slots based on schedule constraints
            for (let day = 1; day <= this.daysPerWeek; day++) {
                for (let period = 1; period <= this.maxPeriods; period++) {
                    node.availableSlots.add(`${day}-${period}`);
                }
            }

            graph.vertices.set(cls.id, node);
            graph.edges.set(cls.id, new Set());
        });

        // Create edges based on conflicts
        classes.forEach(cls => {
            const sourceNode = graph.vertices.get(cls.id);
            if (!sourceNode) return;

            // Find classes that match the conflict time slots
            if (cls.conflicts) {
                classes.forEach(otherCls => {
                    if (cls.id !== otherCls.id) {
                        const conflictExists = cls.conflicts?.some(conflict => 
                            otherCls.dayOfWeek === conflict.dayOfWeek && 
                            otherCls.period === conflict.period
                        );

                        if (conflictExists) {
                            graph.edges.get(cls.id)?.add(otherCls.id);
                            graph.edges.get(otherCls.id)?.add(cls.id);
                            sourceNode.adjacentNodes.add(otherCls.id);
                            graph.vertices.get(otherCls.id)?.adjacentNodes.add(cls.id);
                        }
                    }
                });
            }
        });

        return graph;
    }

    public colorGraph(graph: ScheduleGraph): ColoringResult {
        try {
            const coloring = this.dsatur(graph);
            return {
                success: true,
                schedule: coloring
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during coloring'
            };
        }
    }

    private dsatur(graph: ScheduleGraph): Map<string, TimeSlot> {
        const coloring = new Map<string, TimeSlot>();
        const uncolored = new Set(graph.vertices.keys());
        const saturationDegrees = new Map<string, number>();

        // Initialize saturation degrees based on the number of colored neighbors
        for (const vertexId of uncolored) {
            saturationDegrees.set(vertexId, 0);
        }

        // Helper function to calculate saturation degree
        const calculateSaturationDegree = (vertexId: string): number => {
            const adjacentNodes = graph.edges.get(vertexId) || new Set();
            const coloredNeighbors = new Set<string>();
            
            for (const neighbor of adjacentNodes) {
                const neighborColor = coloring.get(neighbor);
                if (neighborColor) {
                    coloredNeighbors.add(`${neighborColor.dayOfWeek}-${neighborColor.period}`);
                }
            }
            
            return coloredNeighbors.size;
        };

        // Helper function to get vertex with highest saturation
        const getNextVertex = (): string | null => {
            let selectedVertex: string | null = null;
            let maxSaturation = -1;
            let maxDegree = -1;

            for (const vertexId of uncolored) {
                const saturation = calculateSaturationDegree(vertexId);
                const degree = graph.vertices.get(vertexId)?.adjacentNodes.size || 0;

                if (saturation > maxSaturation || 
                    (saturation === maxSaturation && degree > maxDegree)) {
                    maxSaturation = saturation;
                    maxDegree = degree;
                    selectedVertex = vertexId;
                }
            }

            return selectedVertex;
        };

        while (uncolored.size > 0) {
            const vertexId = getNextVertex();
            if (!vertexId) break;

            // Find available color
            const color = this.findAvailableTimeSlot(vertexId, graph, coloring);
            if (!color) {
                throw new Error(`No available time slot for class ${vertexId}`);
            }

            // Assign color
            coloring.set(vertexId, color);
            uncolored.delete(vertexId);

            // Update saturation degrees of uncolored neighbors
            const adjacentNodes = graph.edges.get(vertexId) || new Set();
            for (const adjVertex of adjacentNodes) {
                if (uncolored.has(adjVertex)) {
                    saturationDegrees.set(adjVertex, calculateSaturationDegree(adjVertex));
                }
            }
        }

        return coloring;
    }

    private findAvailableTimeSlot(
        vertexId: string,
        graph: ScheduleGraph,
        coloring: Map<string, TimeSlot>
    ): TimeSlot | null {
        const vertex = graph.vertices.get(vertexId);
        if (!vertex) return null;

        const usedSlots = new Set<string>();
        const adjacentNodes = graph.edges.get(vertexId) || new Set();
        
        // Collect all used slots from adjacent vertices
        for (const adjVertex of adjacentNodes) {
            const color = coloring.get(adjVertex);
            if (color) {
                usedSlots.add(`${color.dayOfWeek}-${color.period}`);
            }
        }

        // Try each possible time slot in order
        const availableSlots = Array.from(vertex.availableSlots)
            .map((slot: string) => {
                const [day, period] = slot.split('-').map(Number);
                return { dayOfWeek: day, period };
            })
            .filter(slot => !usedSlots.has(`${slot.dayOfWeek}-${slot.period}`))
            .sort((a, b) => {
                // Sort by day first, then period
                if (a.dayOfWeek !== b.dayOfWeek) {
                    return a.dayOfWeek - b.dayOfWeek;
                }
                return a.period - b.period;
            });

        return availableSlots.length > 0 ? availableSlots[0] : null;
    }

    public validateColoring(graph: ScheduleGraph): GraphValidationResult {
        const conflicts: Array<{nodeId1: string; nodeId2: string; reason: string}> = [];

        // Check for adjacent vertices with same color
        for (const [vertexId, edges] of graph.edges) {
            const color1 = graph.colors.get(vertexId);
            if (!color1) {
                conflicts.push({
                    nodeId1: vertexId,
                    nodeId2: vertexId,
                    reason: 'Class not assigned a time slot'
                });
                continue;
            }

            // Check if assigned slot is in available slots
            const vertex = graph.vertices.get(vertexId);
            if (vertex && !vertex.availableSlots.has(`${color1.dayOfWeek}-${color1.period}`)) {
                conflicts.push({
                    nodeId1: vertexId,
                    nodeId2: vertexId,
                    reason: 'Class assigned to unavailable time slot'
                });
            }

            // Check conflicts with adjacent vertices
            for (const adjacentId of edges) {
                const color2 = graph.colors.get(adjacentId);
                if (!color2) continue;

                if (color1.dayOfWeek === color2.dayOfWeek && color1.period === color2.period) {
                    conflicts.push({
                        nodeId1: vertexId,
                        nodeId2: adjacentId,
                        reason: `Classes scheduled at the same time: day ${color1.dayOfWeek}, period ${color1.period}`
                    });
                }
            }
        }

        // Check schedule constraints
        for (const [vertexId, color] of graph.colors) {
            // Check if period is within allowed range
            if (color.period > this.maxPeriods) {
                conflicts.push({
                    nodeId1: vertexId,
                    nodeId2: vertexId,
                    reason: `Period ${color.period} exceeds maximum allowed periods per day (${this.maxPeriods})`
                });
            }

            // Check if day is within allowed range
            if (color.dayOfWeek > this.daysPerWeek) {
                conflicts.push({
                    nodeId1: vertexId,
                    nodeId2: vertexId,
                    reason: `Day ${color.dayOfWeek} exceeds maximum allowed days per week (${this.daysPerWeek})`
                });
            }
        }

        return {
            isValid: conflicts.length === 0,
            conflicts: conflicts
        };
    }

    /**
     * Color the graph with randomized vertex ordering for genetic diversity
     */
    public colorGraphWithRandomization(graph: ScheduleGraph): ScheduleGraph {
        const randomizedGraph = this.cloneGraph(graph);
        
        // Get vertices in random order
        const vertices = Array.from(randomizedGraph.vertices.keys());
        this.shuffleArray(vertices);
        
        // Clear existing coloring
        randomizedGraph.colors.clear();
        
        // Color vertices in random order
        for (const vertexId of vertices) {
            const vertex = randomizedGraph.vertices.get(vertexId)!;
            const availableColors = this.getAvailableColors(randomizedGraph, vertex);
            
            if (availableColors.length > 0) {
                // Randomly select from available colors
                const randomIndex = Math.floor(Math.random() * availableColors.length);
                randomizedGraph.colors.set(vertexId, availableColors[randomIndex]);
            } else {
                // If no colors available, try to find alternative slot
                const alternativeSlot = this.findAlternativeSlot(randomizedGraph, vertex);
                if (alternativeSlot) {
                    randomizedGraph.colors.set(vertexId, alternativeSlot);
                } else {
                    throw new Error(`Unable to find valid coloring for vertex ${vertexId}`);
                }
            }
        }
        
        return randomizedGraph;
    }

    /**
     * Repair a potentially invalid coloring while minimizing changes
     */
    public repairColoring(graph: ScheduleGraph): ScheduleGraph {
        const repairedGraph = this.cloneGraph(graph);
        const conflicts = this.findColoringConflicts(repairedGraph);
        
        // Process each conflict
        for (const conflict of conflicts) {
            const vertex1 = repairedGraph.vertices.get(conflict.nodeId1)!;
            const vertex2 = repairedGraph.vertices.get(conflict.nodeId2)!;
            
            // Try to resolve conflict by moving one of the vertices
            const resolved = this.resolveConflict(repairedGraph, vertex1, vertex2);
            
            if (!resolved) {
                // If conflict can't be resolved, recolor both vertices
                this.recolorVertex(repairedGraph, vertex1);
                this.recolorVertex(repairedGraph, vertex2);
            }
        }
        
        return repairedGraph;
    }

    /**
     * Helper method to resolve a conflict between two vertices
     */
    private resolveConflict(graph: ScheduleGraph, vertex1: ClassNode, vertex2: ClassNode): boolean {
        // Try to move vertex1 to a new slot
        const availableColors1 = this.getAvailableColors(graph, vertex1);
        if (availableColors1.length > 0) {
            graph.colors.set(vertex1.id, availableColors1[0]);
            return true;
        }
        
        // If vertex1 can't be moved, try vertex2
        const availableColors2 = this.getAvailableColors(graph, vertex2);
        if (availableColors2.length > 0) {
            graph.colors.set(vertex2.id, availableColors2[0]);
            return true;
        }
        
        return false;
    }

    /**
     * Helper method to recolor a vertex with minimal disruption
     */
    private recolorVertex(graph: ScheduleGraph, vertex: ClassNode): void {
        const currentColor = graph.colors.get(vertex.id);
        const availableColors = this.getAvailableColors(graph, vertex);
        
        if (availableColors.length > 0) {
            // Try to find color closest to current
            if (currentColor) {
                availableColors.sort((a, b) => {
                    const distA = Math.abs(a.dayOfWeek - currentColor.dayOfWeek) + 
                                 Math.abs(a.period - currentColor.period);
                    const distB = Math.abs(b.dayOfWeek - currentColor.dayOfWeek) + 
                                 Math.abs(b.period - currentColor.period);
                    return distA - distB;
                });
            }
            
            graph.colors.set(vertex.id, availableColors[0]);
        } else {
            // If no colors available, try to find alternative slot
            const alternativeSlot = this.findAlternativeSlot(graph, vertex);
            if (alternativeSlot) {
                graph.colors.set(vertex.id, alternativeSlot);
            } else {
                throw new Error(`Unable to find valid coloring for vertex ${vertex.id}`);
            }
        }
    }

    /**
     * Helper method to clone a graph
     */
    private cloneGraph(graph: ScheduleGraph): ScheduleGraph {
        return {
            vertices: new Map(graph.vertices),
            edges: new Map(graph.edges),
            colors: new Map(graph.colors)
        };
    }

    /**
     * Helper method to shuffle an array in place
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
} 