import { Class, Conflict, GradeLevel, DayOfWeek, Period } from 'shared/types';
import { ValidationError } from './validator';

const classNumberPatterns = {
  'Pre-K': /^PK\d{3}$/,
  'K': /^K-\d{3}$/,
  '1': /^1-\d{3}$/,
  '2': /^2-\d{3}$/,
  '3': /^3-\d{3}$/,
  '4': /^4-\d{3}$/,
  '5': /^5-\d{3}$/,
  'multiple': /^([K1-5]\/)+[K1-5]-\d{3}$/,
} as const;

export class ClassInfo implements Omit<Class, 'id' | 'createdAt' | 'updatedAt'> {
  classNumber: string;
  grade: GradeLevel;
  defaultConflicts: Conflict[];
  active: boolean;
  private allConflicts: Set<string>;

  constructor(classNumber: string, roomNumber: string) {
    this.validateClassNumber(classNumber);
    this.validateRoomNumber(roomNumber);
    
    this.classNumber = classNumber;
    this.grade = this.getGradeFromRoom(roomNumber);
    this.defaultConflicts = [];
    this.active = true;
    this.allConflicts = new Set();
  }

  private validateClassNumber(classNumber: string): void {
    if (!/^\d{3}$/.test(classNumber)) {
      throw new ValidationError(`Invalid class number format: ${classNumber}`);
    }
  }

  private validateRoomNumber(roomNumber: string): void {
    const validFormats = [
      /^PK\d{3}$/,                    // Pre-K rooms
      /^K-\d{3}$/,                    // Kindergarten rooms
      /^\d-\d{3}$/,                   // Grade 1-5 rooms
      /^[K1-5]\/[K1-5]\/[K1-5]-\d{3}$/    // Multiple grade rooms
    ];

    if (!validFormats.some(pattern => pattern.test(roomNumber))) {
      throw new ValidationError(`Invalid room number format: ${roomNumber}`);
    }
  }

  private getGradeFromRoom(roomNumber: string): GradeLevel {
    if (roomNumber.startsWith('PK')) return 'Pre-K';
    if (roomNumber.startsWith('K-')) return 'K';
    if (roomNumber.includes('/')) return 'multiple';
    
    const grade = roomNumber.split('-')[0];
    if (['1', '2', '3', '4', '5'].includes(grade)) {
      return grade as GradeLevel;
    }
    
    throw new ValidationError(`Invalid grade in room number: ${roomNumber}`);
  }

  addConflict(dayOfWeek: number, period: number): void {
    // Validate inputs
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      throw new ValidationError(`Invalid day of week: ${dayOfWeek}`);
    }
    if (period < 1 || period > 8) {
      throw new ValidationError(`Invalid period: ${period}`);
    }

    // Check for duplicates
    const conflictKey = `${dayOfWeek}-${period}`;
    if (this.allConflicts.has(conflictKey)) {
      return; // Skip duplicates silently
    }

    this.allConflicts.add(conflictKey);
    this.defaultConflicts.push({ 
      dayOfWeek: dayOfWeek as DayOfWeek, 
      period: period as Period 
    });
  }

  validate(): void {
    // Validate grade matches room number pattern
    const pattern = classNumberPatterns[this.grade];
    if (!pattern) {
      throw new ValidationError(`Invalid grade level: ${this.grade}`);
    }

    // Validate we have at least one conflict
    if (this.defaultConflicts.length === 0) {
      throw new ValidationError(`Class ${this.classNumber} has no conflicts`);
    }

    // Validate no more than 8 conflicts per day
    const conflictsPerDay = new Map<DayOfWeek, number>();
    for (const conflict of this.defaultConflicts) {
      const count = (conflictsPerDay.get(conflict.dayOfWeek) || 0) + 1;
      if (count > 8) {
        throw new ValidationError(
          `Class ${this.classNumber} has more than 8 conflicts on day ${conflict.dayOfWeek}`
        );
      }
      conflictsPerDay.set(conflict.dayOfWeek, count);
    }
  }
} 