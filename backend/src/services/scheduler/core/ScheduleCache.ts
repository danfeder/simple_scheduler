import { ScheduleGraph } from './types/Graph';

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
}

interface ColoringResult {
    colors: Map<string, { dayOfWeek: number; period: number }>;
    timestamp: number;
}

class LRUNode {
    key: string;
    value: ColoringResult;
    prev: LRUNode | null = null;
    next: LRUNode | null = null;

    constructor(key: string, value: ColoringResult) {
        this.key = key;
        this.value = value;
    }
}

export class ScheduleCache {
    private capacity: number;
    private cache: Map<string, LRUNode>;
    private head: LRUNode | null = null;
    private tail: LRUNode | null = null;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        size: 0
    };

    constructor(capacity: number = 100) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    public cacheSubgraph(key: string, graph: ScheduleGraph): void {
        const coloringResult: ColoringResult = {
            colors: new Map(graph.colors),
            timestamp: Date.now()
        };

        if (this.cache.has(key)) {
            // Update existing node
            const node = this.cache.get(key)!;
            node.value = coloringResult;
            this.moveToFront(node);
        } else {
            // Create new node
            const newNode = new LRUNode(key, coloringResult);
            
            // Check capacity
            if (this.cache.size >= this.capacity) {
                this.removeLRU();
            }
            
            this.addNode(newNode);
            this.cache.set(key, newNode);
            this.stats.size = this.cache.size;
        }
    }

    public retrieveSubgraph(key: string): ScheduleGraph | null {
        const node = this.cache.get(key);
        
        if (node) {
            this.stats.hits++;
            this.moveToFront(node);
            
            // Return a new graph with cached colors
            const graph: ScheduleGraph = {
                vertices: new Map(),
                edges: new Map(),
                colors: new Map(node.value.colors)
            };
            
            return graph;
        }
        
        this.stats.misses++;
        return null;
    }

    public getStats(): CacheStats {
        return { ...this.stats };
    }

    public getCacheHitRate(): number {
        const total = this.stats.hits + this.stats.misses;
        return total === 0 ? 0 : (this.stats.hits / total) * 100;
    }

    public clear(): void {
        this.cache.clear();
        this.head = null;
        this.tail = null;
        this.stats = {
            hits: 0,
            misses: 0,
            size: 0
        };
    }

    private moveToFront(node: LRUNode): void {
        if (node === this.head) return;

        // Remove from current position
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        if (node === this.tail) this.tail = node.prev;

        // Move to front
        node.next = this.head;
        node.prev = null;
        if (this.head) this.head.prev = node;
        this.head = node;
        
        if (!this.tail) this.tail = node;
    }

    private addNode(node: LRUNode): void {
        if (!this.head) {
            this.head = node;
            this.tail = node;
        } else {
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }
    }

    private removeLRU(): void {
        if (!this.tail) return;

        const key = this.tail.key;
        this.cache.delete(key);
        
        if (this.head === this.tail) {
            this.head = null;
            this.tail = null;
        } else {
            this.tail = this.tail.prev;
            if (this.tail) this.tail.next = null;
        }
    }
} 