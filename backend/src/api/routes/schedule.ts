import { Router } from 'express';
import { StorageService } from '../../services/storage';
import { SchedulerService } from '../../services/scheduler';
import { SchedulerOptimizer } from '../../services/scheduler/optimizer';
import { v4 as uuidv4 } from 'uuid';
import { Rotation, ScheduleEntry, Class } from 'shared/types';

const router = Router();
const storage = new StorageService();

// Generate schedule
router.post('/generate', async (req, res) => {
  try {
    const { startDate } = req.body;
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    // Get classes and constraints
    const [classes, constraints] = await Promise.all([
      storage.getAllClasses(),
      storage.getConstraints()
    ]);

    if (!constraints) {
      return res.status(400).json({ error: 'No constraints found' });
    }

    // Initialize scheduler
    const scheduler = new SchedulerService(constraints);
    await scheduler.initialize(classes);

    // Generate schedule
    const schedule = await scheduler.generateSchedule(new Date(startDate));

    // Create rotation
    const rotation: Rotation = {
      id: uuidv4(),
      startDate: new Date(startDate),
      status: 'draft',
      schedule,
      additionalConflicts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save rotation
    const savedRotation = await storage.saveRotation(rotation);
    res.json(savedRotation);
  } catch (error) {
    console.error('Failed to generate schedule:', error);
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

export const scheduleRouter = router; 