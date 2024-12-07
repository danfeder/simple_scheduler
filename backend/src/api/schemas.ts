import { z } from 'zod';
import { GradeLevel, DayOfWeek, Period } from '../../../shared/types';

// Base schemas
const conflictSchema = z.object({
  dayOfWeek: z.number().min(1).max(5) as z.ZodType<DayOfWeek>,
  period: z.number().min(1).max(8) as z.ZodType<Period>
});

// Class schemas
export const createClassSchema = z.object({
  classNumber: z.string().min(1),
  grade: z.enum(['Pre-K', 'K', '1', '2', '3', '4', '5', 'multiple']) as z.ZodType<GradeLevel>,
  defaultConflicts: z.array(conflictSchema),
  active: z.boolean().default(true)
});

export const updateClassSchema = createClassSchema.partial().extend({
  id: z.string().uuid()
});

// Rotation schemas
export const scheduleEntrySchema = z.object({
  classId: z.string().uuid(),
  assignedDate: z.coerce.date(),
  period: z.number().min(1).max(8) as z.ZodType<Period>
});

export const createRotationSchema = z.object({
  startDate: z.coerce.date(),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
  schedule: z.array(scheduleEntrySchema).optional(),
  additionalConflicts: z.array(conflictSchema.extend({
    classId: z.string().uuid()
  })).optional(),
  notes: z.string().optional()
});

export const updateRotationSchema = createRotationSchema.partial().extend({
  id: z.string().uuid()
});

// Query params schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

export const classQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  grade: z.enum(['Pre-K', 'K', '1', '2', '3', '4', '5', 'multiple']).optional() as z.ZodType<GradeLevel | undefined>
}); 