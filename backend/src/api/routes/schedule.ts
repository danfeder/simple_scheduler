import { Router } from 'express';
import { StorageService } from '../../services/storage';
import { SchedulerService } from '../../services/scheduler';
import { MultiWeekOptimizer } from '../../services/scheduler/multiWeekOptimizer';
import { v4 as uuidv4 } from 'uuid';
import { Rotation, ScheduleEntry, Class, Period } from 'shared/types';
import { OptimizationProgress, ScheduledClass } from '../../services/scheduler/types';

const router = Router();
const storage = new StorageService();

// Generate schedule
router.post('/generate', async (req, res) => {
  try {
    const { startDate } = req.body;
    
    // Get constraints from storage
    const constraints = await storage.getConstraints();
    if (!constraints) {
      throw new Error('No schedule constraints found');
    }
    
    // Initialize scheduler with constraints
    const scheduler = new SchedulerService(constraints);
    await scheduler.initialize(await storage.getAllClasses());
    
    // Generate schedule
    const schedule = await scheduler.generateSchedule(new Date(startDate));
    
    if (!schedule) {
      throw new Error('Failed to generate schedule');
    }

    // Convert to rotation format and save
    const rotation = await storage.saveRotation({
      id: uuidv4(),
      startDate: new Date(startDate),
      schedule: schedule.map((entry: ScheduleEntry) => ({
        classId: entry.classId,
        assignedDate: entry.assignedDate,
        period: entry.period
      })),
      status: 'draft',
      additionalConflicts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json(rotation);
  } catch (error) {
    console.error('Schedule generation error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Failed to generate schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all rotations
router.get('/', async (req, res) => {
  try {
    const rotations = await storage.getAllRotations();
    res.json(rotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rotations' });
  }
});

// Get rotation by ID
router.get('/:id', async (req, res) => {
  try {
    const rotation = await storage.getRotationById(req.params.id);
    if (!rotation) {
      return res.status(404).json({ error: 'Rotation not found' });
    }
    res.json(rotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rotation' });
  }
});

// Update rotation
router.put('/:id', async (req, res) => {
  try {
    const existingRotation = await storage.getRotationById(req.params.id);
    if (!existingRotation) {
      return res.status(404).json({ error: 'Rotation not found' });
    }

    const updatedRotation = await storage.saveRotation({
      ...existingRotation,
      ...req.body,
      id: req.params.id,
      updatedAt: new Date()
    });
    res.json(updatedRotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rotation' });
  }
});

// Delete rotation
router.delete('/:id', async (req, res) => {
  try {
    const success = await storage.deleteRotation(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Rotation not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rotation' });
  }
});

// Check conflicts for a class at a specific time
router.get('/:id/conflicts', async (req, res) => {
  try {
    const { classId, dayOfWeek, period } = req.query;
    const rotation = await storage.getRotationById(req.params.id);
    
    if (!rotation) {
      return res.status(404).json({ error: 'Rotation not found' });
    }

    if (!classId || !dayOfWeek || !period) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    // Get the class details
    const classDoc = await storage.getClassById(classId as string);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check for conflicts
    const hasConflicts = classDoc.defaultConflicts?.some(
      conflict => 
        conflict.dayOfWeek === Number(dayOfWeek) &&
        conflict.period === Number(period)
    );

    // Check for overlapping classes in the schedule
    const hasOverlap = rotation.schedule.some(
      entry => 
        entry.classId !== classId &&
        new Date(entry.assignedDate).getDay() === Number(dayOfWeek) &&
        entry.period === Number(period)
    );

    res.json({
      hasConflicts: hasConflicts || hasOverlap,
      conflicts: {
        defaultConflicts: hasConflicts,
        overlappingClass: hasOverlap
      }
    });
  } catch (error) {
    console.error('Failed to check conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Update class schedule
router.patch('/:id/class/:classId', async (req, res) => {
  try {
    const { id, classId } = req.params;
    const { dayOfWeek, period } = req.body;

    const rotation = await storage.getRotationById(id);
    if (!rotation) {
      return res.status(404).json({ error: 'Rotation not found' });
    }

    // Find the class in the schedule
    const classIndex = rotation.schedule.findIndex(entry => entry.classId === classId);
    if (classIndex === -1) {
      return res.status(404).json({ error: 'Class not found in schedule' });
    }

    // Validate period is within valid range
    const periodNum = Number(period);
    if (periodNum < 1 || periodNum > 8) {
      return res.status(400).json({ error: 'Invalid period number' });
    }

    // Update the class's schedule
    const updatedSchedule = [...rotation.schedule];
    const classEntry = updatedSchedule[classIndex];
    const newDate = new Date(rotation.startDate);
    newDate.setDate(newDate.getDate() + (Number(dayOfWeek) - 1));
    
    updatedSchedule[classIndex] = {
      ...classEntry,
      assignedDate: newDate,
      period: periodNum as Period
    };

    // Save the updated rotation
    const updatedRotation = await storage.saveRotation({
      ...rotation,
      schedule: updatedSchedule,
      updatedAt: new Date()
    });

    res.json(updatedRotation);
  } catch (error) {
    console.error('Failed to update class schedule:', error);
    res.status(500).json({ error: 'Failed to update class schedule' });
  }
});

// Optimize schedule
router.post('/:id/optimize', async (req, res) => {
  console.group('Schedule Optimization Request');
  const totalStartTime = performance.now();

  try {
    const { id } = req.params;
    const { maxTimeSeconds = 30 } = req.body;

    console.log(`Request parameters: id=${id}, maxTimeSeconds=${maxTimeSeconds}`);

    // Get the rotation
    console.group('Data Loading');
    const loadStart = performance.now();

    const rotation = await storage.getRotationById(id);
    if (!rotation) {
      console.log('Rotation not found:', id);
      return res.status(404).json({ error: 'Rotation not found' });
    }

    console.log('Rotation details:', {
      startDate: rotation.startDate,
      scheduleEntries: rotation.schedule.length,
      status: rotation.status
    });

    // Get constraints from storage
    const constraints = await storage.getConstraints();
    if (!constraints) {
      console.error('No constraints found in storage');
      throw new Error('No schedule constraints found');
    }

    console.log('Constraints loaded:', {
      maxPeriodsPerDay: constraints.maxPeriodsPerDay,
      maxPeriodsPerWeek: constraints.maxPeriodsPerWeek,
      maxConsecutivePeriods: constraints.maxConsecutivePeriods,
      blackoutPeriods: constraints.blackoutPeriods.length
    });

    // Get all classes
    const allClasses = await storage.getAllClasses();
    console.log(`Loaded ${allClasses.length} classes`);
    
    console.log(`Data loading took ${(performance.now() - loadStart).toFixed(2)}ms`);
    console.groupEnd();

    // Initialize scheduler
    console.group('Scheduler Setup');
    const setupStart = performance.now();

    const scheduler = new SchedulerService(constraints);
    await scheduler.initialize(allClasses);
    scheduler['schedule'] = rotation.schedule;

    console.log(`Scheduler setup took ${(performance.now() - setupStart).toFixed(2)}ms`);
    console.groupEnd();

    // Run optimization
    console.group('Optimization');
    const optimizationStart = performance.now();

    const optimizationResult = await scheduler.optimizeSchedule(rotation.startDate, maxTimeSeconds);

    if (!optimizationResult.schedule) {
      console.error('Optimization failed:', optimizationResult.message);
      throw new Error('Optimization failed: ' + optimizationResult.message);
    }

    console.log('Optimization metrics:', {
      score: optimizationResult.score.totalScore,
      weeksUsed: optimizationResult.weeksUsed,
      timeElapsed: optimizationResult.timeElapsed
    });

    console.log(`Optimization took ${(performance.now() - optimizationStart).toFixed(2)}ms`);
    console.groupEnd();

    // Save results
    console.group('Saving Results');
    const saveStart = performance.now();

    const updatedRotation = await storage.saveRotation({
      ...rotation,
      schedule: optimizationResult.schedule.classes.map(cls => ({
        classId: cls.id,
        assignedDate: cls.startTime,
        period: cls.period as Period
      })),
      status: 'draft',
      updatedAt: new Date()
    });

    console.log('Save metrics:', {
      originalScheduleSize: rotation.schedule.length,
      optimizedScheduleSize: updatedRotation.schedule.length,
      score: optimizationResult.score.totalScore
    });

    console.log(`Saving took ${(performance.now() - saveStart).toFixed(2)}ms`);
    console.groupEnd();

    const totalTime = performance.now() - totalStartTime;
    console.log(`\nTotal request time: ${totalTime.toFixed(2)}ms`);

    res.json({
      rotation: updatedRotation,
      optimizationResult: {
        score: optimizationResult.score,
        weeksUsed: optimizationResult.weeksUsed,
        timeElapsed: optimizationResult.timeElapsed,
        message: optimizationResult.message
      }
    });
  } catch (error) {
    console.group('Request Error');
    console.error('Error details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      error: 'Failed to optimize schedule',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
    console.groupEnd();
  } finally {
    console.groupEnd(); // Schedule Optimization Request
  }
});

export const scheduleRouter = router; 