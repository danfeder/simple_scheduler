import { PerformanceMetrics } from '../common/logging';
import { ScheduleQualityMetrics } from '../../../shared/types/optimization';

export class SchedulerMetrics {
  private static instance: SchedulerMetrics;
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): SchedulerMetrics {
    if (!SchedulerMetrics.instance) {
      SchedulerMetrics.instance = new SchedulerMetrics();
    }
    return SchedulerMetrics.instance;
  }

  // Generation metrics
  public startGeneration(): void {
    this.startTimes.set('generation', performance.now());
    this.incrementCounter('scheduler_generation_attempts_total');
  }

  public endGeneration(): void {
    const startTime = this.startTimes.get('generation');
    if (startTime) {
      const duration = (performance.now() - startTime) / 1000; // Convert to seconds
      this.metrics.set('scheduler_generation_duration_seconds', duration);
      this.startTimes.delete('generation');
    }
  }

  // Constraint violation tracking
  public recordConstraintViolation(): void {
    this.incrementCounter('scheduler_constraint_violations_total');
  }

  // Performance metrics
  public recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.metrics.set('sorting_duration_ms', metrics.sortingDurationMs);
    this.metrics.set('total_class_count', metrics.totalClassCount);
    this.metrics.set('scheduling_duration_ms', metrics.schedulingDurationMs);
    this.metrics.set('average_time_per_class', metrics.schedulingDurationMs / metrics.totalClassCount);
  }

  // Quality metrics
  public recordQualityMetrics(metrics: ScheduleQualityMetrics): void {
    this.metrics.set('average_classes_per_day', metrics.averageClassesPerDay);
    this.metrics.set('day_utilization', metrics.dayUtilization);
    this.metrics.set('average_gap_between_classes', metrics.averageGapBetweenClasses);
    this.metrics.set('consecutive_class_count', metrics.consecutiveClassCount);
    this.metrics.set('constraint_satisfaction_rate', metrics.constraintSatisfactionRate);
    this.metrics.set('total_quality_score', metrics.totalScore);
  }

  // Helper methods
  private incrementCounter(name: string): void {
    this.metrics.set(name, (this.metrics.get(name) || 0) + 1);
  }

  public getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  public reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  public logMetrics(): void {
    console.log('Scheduler Metrics:');
    for (const [key, value] of this.metrics.entries()) {
      console.log(`${key}: ${value}`);
    }
  }
} 