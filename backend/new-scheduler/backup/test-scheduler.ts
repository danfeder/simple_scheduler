import { SchedulerService } from './services/scheduler';
import type { ScheduleConstraints, Class } from '../../shared/types';

async function testScheduler() {
  try {
    // Create test classes with conflicts
    const testClasses: Class[] = [
      // Grade 1 classes (heavy morning conflicts)
      {
        id: '101',
        classNumber: '1-101',
        grade: '1',
        defaultConflicts: [
          { dayOfWeek: 1, period: 1 },
          { dayOfWeek: 1, period: 2 },
          { dayOfWeek: 2, period: 1 },
          { dayOfWeek: 3, period: 1 }
        ],
        active: true
      },
      {
        id: '102',
        classNumber: '1-102',
        grade: '1',
        defaultConflicts: [
          { dayOfWeek: 1, period: 2 },
          { dayOfWeek: 1, period: 3 },
          { dayOfWeek: 2, period: 2 },
          { dayOfWeek: 3, period: 2 }
        ],
        active: true
      },
      // Grade 2 classes (afternoon conflicts)
      {
        id: '201',
        classNumber: '2-201',
        grade: '2',
        defaultConflicts: [
          { dayOfWeek: 1, period: 6 },
          { dayOfWeek: 1, period: 7 },
          { dayOfWeek: 2, period: 6 }
        ],
        active: true
      },
      {
        id: '202',
        classNumber: '2-202',
        grade: '2',
        defaultConflicts: [
          { dayOfWeek: 1, period: 7 },
          { dayOfWeek: 1, period: 8 },
          { dayOfWeek: 2, period: 7 }
        ],
        active: true
      },
      // Grade 3 classes (mid-day conflicts)
      {
        id: '301',
        classNumber: '3-301',
        grade: '3',
        defaultConflicts: [
          { dayOfWeek: 1, period: 4 },
          { dayOfWeek: 2, period: 4 },
          { dayOfWeek: 3, period: 4 }
        ],
        active: true
      },
      {
        id: '302',
        classNumber: '3-302',
        grade: '3',
        defaultConflicts: [
          { dayOfWeek: 1, period: 5 },
          { dayOfWeek: 2, period: 5 },
          { dayOfWeek: 3, period: 5 }
        ],
        active: true
      },
      // Grade 4 classes (scattered conflicts)
      {
        id: '401',
        classNumber: '4-401',
        grade: '4',
        defaultConflicts: [
          { dayOfWeek: 1, period: 2 },
          { dayOfWeek: 2, period: 4 },
          { dayOfWeek: 3, period: 6 }
        ],
        active: true
      },
      {
        id: '402',
        classNumber: '4-402',
        grade: '4',
        defaultConflicts: [
          { dayOfWeek: 1, period: 3 },
          { dayOfWeek: 2, period: 5 },
          { dayOfWeek: 3, period: 7 }
        ],
        active: true
      },
      // Grade 5 classes (minimal conflicts)
      {
        id: '501',
        classNumber: '5-501',
        grade: '5',
        defaultConflicts: [
          { dayOfWeek: 1, period: 1 }
        ],
        active: true
      },
      {
        id: '502',
        classNumber: '5-502',
        grade: '5',
        defaultConflicts: [
          { dayOfWeek: 1, period: 8 }
        ],
        active: true
      },
      // Kindergarten classes (many conflicts)
      {
        id: 'K01',
        classNumber: 'K-101',
        grade: 'K',
        defaultConflicts: [
          { dayOfWeek: 1, period: 1 },
          { dayOfWeek: 1, period: 2 },
          { dayOfWeek: 1, period: 3 },
          { dayOfWeek: 2, period: 1 },
          { dayOfWeek: 2, period: 2 },
          { dayOfWeek: 3, period: 1 }
        ],
        active: true
      },
      {
        id: 'K02',
        classNumber: 'K-102',
        grade: 'K',
        defaultConflicts: [
          { dayOfWeek: 1, period: 6 },
          { dayOfWeek: 1, period: 7 },
          { dayOfWeek: 1, period: 8 },
          { dayOfWeek: 2, period: 6 },
          { dayOfWeek: 2, period: 7 },
          { dayOfWeek: 3, period: 6 }
        ],
        active: true
      }
    ];

    // Define scheduling constraints
    const constraints: ScheduleConstraints = {
      maxPeriodsPerDay: 3,
      maxPeriodsPerWeek: 8,
      blackoutPeriods: [
        { date: new Date('2024-09-03'), period: 8 }, // Block last period of first day
        { date: new Date('2024-09-04'), period: 1 }  // Block first period of second day
      ],
      avoidConsecutivePeriods: true,
      maxConsecutivePeriods: 2
    };

    // Create scheduler instance
    console.log('Initializing scheduler...');
    const startDate = new Date('2024-09-03'); // September 3, 2024
    const scheduler = new SchedulerService(startDate, constraints);

    // Generate schedule
    console.log('Generating schedule...');
    console.time('scheduleGeneration');
    const schedule = await scheduler.generateSchedule(testClasses);
    console.timeEnd('scheduleGeneration');

    // Print results
    console.log('\nSchedule generated successfully!');
    console.log(`Total assignments: ${schedule.length}`);
    console.log(`Classes scheduled: ${new Set(schedule.map(s => s.classId)).size}`);

    // Group assignments by date for better readability
    const scheduleByDate = new Map<string, any[]>();
    for (const entry of schedule) {
      const dateKey = entry.assignedDate.toISOString().split('T')[0];
      if (!scheduleByDate.has(dateKey)) {
        scheduleByDate.set(dateKey, []);
      }
      scheduleByDate.get(dateKey)!.push({
        classId: entry.classId,
        period: entry.period
      });
    }

    // Print schedule by date
    console.log('\nSchedule by date:');
    for (const [date, entries] of scheduleByDate) {
      console.log(`\n${date}:`);
      entries.sort((a, b) => a.period - b.period);
      
      // Count assignments per period
      const periodsUsed = new Set(entries.map(e => e.period)).size;
      const assignmentsCount = entries.length;
      
      for (const entry of entries) {
        const classInfo = testClasses.find(c => c.id === entry.classId);
        console.log(`  Period ${entry.period}: ${classInfo?.grade} Class ${classInfo?.classNumber || entry.classId}`);
      }
      console.log(`  (${assignmentsCount} assignments across ${periodsUsed} periods)`);
    }

    // Print statistics
    console.log('\nScheduling Statistics:');
    console.log(`Total classes: ${testClasses.length}`);
    const gradeDistribution = new Map<string, number>();
    schedule.forEach(entry => {
      const classInfo = testClasses.find(c => c.id === entry.classId);
      if (classInfo) {
        gradeDistribution.set(classInfo.grade, (gradeDistribution.get(classInfo.grade) || 0) + 1);
      }
    });
    console.log('Assignments per grade:');
    for (const [grade, count] of gradeDistribution) {
      console.log(`  ${grade}: ${count}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testScheduler().catch(console.error); 