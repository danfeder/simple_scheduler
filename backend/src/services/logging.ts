export interface PerformanceMetrics {
  sortingDurationMs: number;
  totalClassCount: number;
  schedulingDurationMs: number;
}

export class LoggingService {
  private static instance: LoggingService;
  private metrics: PerformanceMetrics = {
    sortingDurationMs: 0,
    totalClassCount: 0,
    schedulingDurationMs: 0
  };

  private constructor() {}

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public startOperation(operation: keyof PerformanceMetrics): number {
    return performance.now();
  }

  public endOperation(operation: keyof PerformanceMetrics, startTime: number): void {
    const duration = performance.now() - startTime;
    this.metrics[operation] = duration;
  }

  public setMetric(key: keyof PerformanceMetrics, value: number): void {
    this.metrics[key] = value;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logPerformance(): void {
    console.log('Performance Metrics:', {
      ...this.metrics,
      averageTimePerClass: this.metrics.schedulingDurationMs / this.metrics.totalClassCount
    });
  }
} 