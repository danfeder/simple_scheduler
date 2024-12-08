import { ScheduleEntry } from './schedule';

export interface SchedulerConfig {
  dayDistributionWeight: number;
  spacingWeight: number;
}

export interface ScheduleQualityMetrics {
  // Distribution Metrics
  averageClassesPerDay: number;
  standardDeviationClassesPerDay: number;
  dayUtilization: number;

  // Spacing Metrics
  averageGapBetweenClasses: number;
  minimumGapBetweenClasses: number;
  consecutiveClassCount: number;

  // Time Slot Usage
  morningPeriodUtilization: number;
  middayPeriodUtilization: number;
  afternoonPeriodUtilization: number;
  
  // Overall Metrics
  totalScore: number;
  constraintSatisfactionRate: number;
}

export interface OptimizationResult {
  metrics: ScheduleQualityMetrics;
  schedule: ScheduleEntry[];
  config: SchedulerConfig;
  iterationCount: number;
  improvementCount: number;
  runtime: number;
} 