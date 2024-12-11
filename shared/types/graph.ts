import { Class } from './class';

export interface TimeSlot {
    dayOfWeek: number;  // 1-5 for Monday-Friday
    period: number;     // 1-8 for periods
}

export interface ClassNode {
    id: string;
    name: string;
    constraints: Set<string>;
    saturationDegree: number;
    adjacentNodes: Set<string>;
    availableSlots: Set<string>;
}

// Enhanced vertex type that extends ClassNode functionality
export interface ScheduleVertex extends Omit<ClassNode, 'constraints' | 'adjacentNodes' | 'availableSlots'> {
    classId: string;
    adjacentVertices: Set<string>;
    availableColors: Set<number>;
}

export interface ScheduleEdge {
    vertex1: string;
    vertex2: string;
    weight: number;
}

// Enhanced graph type that supports both legacy and new functionality
export interface ScheduleGraph {
    vertices: Map<string, ScheduleVertex | ClassNode>;
    edges: ScheduleEdge[] | Map<string, Set<string>>;
    classes: Map<string, Class>;
    colors?: Map<string, TimeSlot>;
}

export interface ColoringResult {
    success: boolean;
    coloring?: Map<string, TimeSlot>;
    schedule?: Map<string, TimeSlot>;  // For backward compatibility
    error?: string;
    metrics?: {
        iterations: number;
        backtrackCount: number;
        timeElapsed: number;
    };
}

export interface GraphValidationResult {
    isValid: boolean;
    errors: Array<{
        type: 'conflict' | 'constraint' | 'structure';
        message: string;
        vertices?: string[];
    }>;
    conflicts?: Array<{  // For backward compatibility
        nodeId1: string;
        nodeId2: string;
        reason: string;
    }>;
}

export interface GraphMetrics {
    vertexCount: number;
    edgeCount: number;
    averageDegree: number;
    maxDegree: number;
    chromaticNumber: number;
    density: number;
} 