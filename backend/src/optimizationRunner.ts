import { SchedulerService } from './services/scheduler/schedulerService';
import { SchedulerOptimizer } from './services/scheduler/optimizer';
import { ClassDataConverter } from './services/classDataConverter';
import { ScheduleConstraints } from './services/scheduler/types';
import * as fs from 'fs';
import * as path from 'path';

async function runOptimization() {
    // 1. Load and parse the schedule data
    const scheduleText = fs.readFileSync(
        path.join(__dirname, '../../../test_data/parsed_schedule.txt'),
        'utf-8'
    );
    const classes = ClassDataConverter.parseScheduleText(scheduleText);
    
    console.log(`Loaded ${classes.length} classes`);

    // 2. Set up constraints
    const constraints: ScheduleConstraints = {
        maxClassesPerDay: 4,
        minGapBetweenClasses: 15,  // 15 minutes minimum gap
        maxGapBetweenClasses: 120, // 2 hours maximum gap
        maxPeriodsPerDay: 2,
        maxPeriodsPerWeek: 5,
        blackoutPeriods: [],
        avoidConsecutivePeriods: true,
        maxConsecutivePeriods: 1
    };

    // 3. Create scheduler and optimizer
    const startDate = new Date('2024-09-03');  // First Tuesday after Labor Day 2024
    const scheduler = new SchedulerService();
    const optimizer = new SchedulerOptimizer(scheduler, startDate);

    console.log('\nGenerating and evaluating schedule...');
    
    try {
        // 4. Generate and evaluate schedule
        const result = await optimizer.generateAndEvaluateSchedule(classes);
        
        // 5. Log results
        console.log('\nSchedule Quality Metrics:');
        console.log('Day Distribution:', result.metrics.metrics.dayDistribution.toFixed(2));
        console.log('Time Gaps:', result.metrics.metrics.timeGaps.toFixed(2));
        console.log('Period Utilization:', result.metrics.metrics.periodUtilization.toFixed(2));
        console.log('Total Score:', result.metrics.totalScore.toFixed(2));
        
        // 6. Save results
        const outputPath = path.join(__dirname, '../../../schedule_results.json');
        fs.writeFileSync(outputPath, JSON.stringify({
            metrics: result.metrics,
            schedule: result.schedule
        }, null, 2));
        
        console.log(`\nResults saved to ${outputPath}`);
        
    } catch (error) {
        console.error('Schedule generation failed:', error);
    }
}

// Run the optimization
runOptimization().catch(console.error); 