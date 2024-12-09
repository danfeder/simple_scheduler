import { Router } from 'express';
import multer from 'multer';
import { StorageService } from '../../services/storage';
import { PythonPdfParser } from '../../services/pdf/pythonParser';
import { validatePdfSchedule } from '../../services/pdf/validator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const storage = new StorageService();
const pdfParser = new PythonPdfParser();

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await storage.getAllClasses();
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Create new class
router.post('/', async (req, res) => {
  try {
    const newClass = await storage.saveClass(req.body);
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', async (req, res) => {
  try {
    const existingClass = await storage.getClassById(req.params.id);
    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const updatedClass = await storage.saveClass({
      ...existingClass,
      ...req.body,
      id: req.params.id
    });
    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/:id', async (req, res) => {
  try {
    const success = await storage.deleteClass(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Import PDF schedule
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate PDF first
    const validationResult = await validatePdfSchedule(req.file.buffer);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        error: 'Invalid PDF format',
        details: validationResult.errors 
      });
    }
    
    // Parse and save classes
    const parsedClasses = await pdfParser.parseSchedule(req.file.buffer);
    const savedClasses = await Promise.all(
      parsedClasses.map(cls => storage.saveClass(cls))
    );
    
    res.json(savedClasses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import schedule' });
  }
});

// Get class conflicts
router.get('/:id/conflicts', async (req, res) => {
  try {
    const cls = await storage.getClassById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(cls.defaultConflicts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

export const classesRouter = router; 