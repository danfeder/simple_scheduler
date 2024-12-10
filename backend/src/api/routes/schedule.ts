import { Router } from 'express';
import { StorageService } from '../../services/storage';
import { SchedulerService } from '../../services/scheduler';
import { SchedulerOptimizer } from '../../services/scheduler/optimizer';
import { v4 as uuidv4 } from 'uuid';
import { Rotation, ScheduleEntry, Class, Period } from 'shared/types';

const router = Router();
const storage = new StorageService();

// Generate schedule
router.post('/generate', async (req, res) => {
  try {
    const { startDate, constraints } = req.body;
    const scheduler = new SchedulerService(constraints);
    const optimizer = new SchedulerOptimizer(scheduler, new Date(startDate));
    await scheduler.initialize(await storage.getAllClasses());
    
    // Generate schedule
    const rawSchedule = await scheduler.generateSchedule(new Date(startDate));
    
    // Optimize and evaluate schedule
    const quality = await optimizer.optimizeSchedule(rawSchedule);
    
    // Convert to rotation format
    const rotation = await storage.saveRotation({
      startDate: new Date(startDate),
      schedule: rawSchedule,
      status: 'draft',
      additionalConflicts: [],
      quality
    });

    res.json(rotation);
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'Failed to generate schedule' });
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

export const scheduleRouter = router; 