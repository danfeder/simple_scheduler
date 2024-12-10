export interface ScheduledClass {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  period: number;
  room?: string;
}

export interface Schedule {
  classes: ScheduledClass[];
  metadata: {
    generatedAt: Date;
    version: string;
    qualityScore?: number;
  };
  quality: {
    totalScore: number;
    metrics: {
      dayDistribution: number;
      timeGaps: number;
      periodUtilization: number;
    };
  };
}

