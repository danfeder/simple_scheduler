import { Router } from 'express';
import { StorageService } from '../../services/storage';
import { ScheduleConstraints } from 'shared/types';

const router = Router();
const storage = new StorageService();

// Default constraints
const defaultConstraints: ScheduleConstraints = {
  maxPeriodsPerDay: 8,
  maxPeriodsPerWeek: 40,
  maxConsecutivePeriods: 3,
  avoidConsecutivePeriods: true,
  blackoutPeriods: []
};

// Get current constraints
router.get('/', async (req, res) => {
  try {
    const constraints = await storage.getConstraints();
    res.json(constraints || defaultConstraints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constraints' });
  }
});

// Update constraints
router.put('/', async (req, res) => {
  try {
    const validationResult = validateConstraints(req.body);
    if (!validationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid constraints',
        details: validationResult.errors 
      });
    }

    const updatedConstraints = await storage.saveConstraints(req.body);
    res.json(updatedConstraints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update constraints' });
  }
});

// Validate constraints
router.post('/validate', async (req, res) => {
  try {
    const validationResult = validateConstraints(req.body);
    res.json(validationResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate constraints' });
  }
});

// Get constraint templates
router.get('/templates', async (req, res) => {
  try {
    const templates: ScheduleConstraints[] = [
      {
        maxPeriodsPerDay: 4,
        maxPeriodsPerWeek: 20,
        maxConsecutivePeriods: 2,
        avoidConsecutivePeriods: true,
        blackoutPeriods: []
      },
      {
        maxPeriodsPerDay: 6,
        maxPeriodsPerWeek: 30,
        maxConsecutivePeriods: 3,
        avoidConsecutivePeriods: false,
        blackoutPeriods: []
      },
      {
        maxPeriodsPerDay: 8,
        maxPeriodsPerWeek: 40,
        maxConsecutivePeriods: 4,
        avoidConsecutivePeriods: false,
        blackoutPeriods: []
      }
    ];
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constraint templates' });
  }
});

function validateConstraints(constraints: ScheduleConstraints): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (constraints.maxPeriodsPerDay < 1 || constraints.maxPeriodsPerDay > 8) {
    errors.push('maxPeriodsPerDay must be between 1 and 8');
  }

  if (constraints.maxPeriodsPerWeek < constraints.maxPeriodsPerDay) {
    errors.push('maxPeriodsPerWeek cannot be less than maxPeriodsPerDay');
  }

  if (constraints.maxPeriodsPerWeek > 40) {
    errors.push('maxPeriodsPerWeek cannot exceed 40');
  }

  if (constraints.maxConsecutivePeriods < 1) {
    errors.push('maxConsecutivePeriods must be at least 1');
  }

  if (constraints.maxConsecutivePeriods > constraints.maxPeriodsPerDay) {
    errors.push('maxConsecutivePeriods cannot exceed maxPeriodsPerDay');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const constraintsRouter = router; 