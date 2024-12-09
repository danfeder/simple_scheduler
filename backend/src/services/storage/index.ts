import { Class, Rotation, ScheduleConstraints } from 'shared/types';
import { LoggingService } from '../common/logging';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class StorageService {
  private dataDir: string;
  private classesFile: string;
  private rotationsFile: string;
  private constraintsFile: string;
  private backupDir: string;

  constructor() {
    const rootDir = path.resolve(__dirname, '../../..');
    this.dataDir = path.join(rootDir, 'data');
    this.backupDir = path.join(this.dataDir, 'backups');
    this.classesFile = path.join(this.dataDir, 'classes.json');
    this.rotationsFile = path.join(this.dataDir, 'rotations.json');
    this.constraintsFile = path.join(this.dataDir, 'constraints.json');
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
      await fs.access(this.backupDir).catch(() => fs.mkdir(this.backupDir, { recursive: true }));
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  private async createBackup(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${fileName}.${timestamp}.backup`);
    try {
      await fs.copyFile(filePath, backupPath);
      console.log('Created backup at:', backupPath);
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
      console.log('Reading file:', filePath);
      const data = await fs.readFile(filePath, 'utf-8');
      console.log('File contents:', data);
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('File contents is not an array');
      }
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('File not found:', filePath);
        return [];
      }
      console.error('Error reading file:', filePath, error);
      throw error;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    try {
      await this.ensureDataDir();
      
      // Create backup before writing if file exists
      try {
        await fs.access(filePath);
        await this.createBackup(filePath);
      } catch {}

      console.log('Writing file:', filePath);
      console.log('Data to write:', data);
      
      // Validate data is an array
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      // Format JSON with proper indentation
      const jsonString = JSON.stringify(data, null, 2);
      
      // Validate JSON can be parsed back
      try {
        JSON.parse(jsonString);
      } catch (error) {
        throw new Error('Generated JSON is invalid');
      }

      await fs.writeFile(filePath, jsonString);
      console.log('File written successfully');
    } catch (error) {
      console.error('Error writing file:', filePath, error);
      throw error;
    }
  }

  private validateClass(classData: Class): void {
    if (!classData.classNumber) throw new Error('Class number is required');
    if (!classData.grade) throw new Error('Grade is required');
    if (!Array.isArray(classData.defaultConflicts)) throw new Error('Default conflicts must be an array');
    
    // Validate each conflict
    classData.defaultConflicts.forEach((conflict, index) => {
      if (!conflict.dayOfWeek || !conflict.period) {
        throw new Error(`Invalid conflict at index ${index}`);
      }
      if (conflict.dayOfWeek < 1 || conflict.dayOfWeek > 5) {
        throw new Error(`Invalid day of week at index ${index}`);
      }
      if (conflict.period < 1 || conflict.period > 8) {
        throw new Error(`Invalid period at index ${index}`);
      }
    });
  }

  // Class operations
  async getAllClasses(): Promise<Class[]> {
    return this.readJsonFile<Class>(this.classesFile);
  }

  async getClassById(id: string): Promise<Class | null> {
    const classes = await this.getAllClasses();
    return classes.find(c => c.id === id) || null;
  }

  async saveClass(classData: Class): Promise<Class> {
    // Validate class data
    this.validateClass(classData);

    const classes = await this.getAllClasses();
    const now = new Date();

    if (!classData.id) {
      classData.id = crypto.randomUUID();
      classData.createdAt = now;
    }
    classData.updatedAt = now;

    const existingIndex = classes.findIndex(c => c.id === classData.id);
    if (existingIndex >= 0) {
      classes[existingIndex] = classData;
    } else {
      classes.push(classData);
    }

    await this.writeJsonFile(this.classesFile, classes);
    return classData;
  }

  async saveClasses(classes: Class[]): Promise<Class[]> {
    // Validate all classes
    classes.forEach(classData => this.validateClass(classData));

    const now = new Date();
    const validatedClasses = classes.map(classData => ({
      ...classData,
      id: classData.id || crypto.randomUUID(),
      createdAt: classData.createdAt || now,
      updatedAt: now,
      active: true
    }));

    await this.writeJsonFile(this.classesFile, validatedClasses);
    return validatedClasses;
  }

  async deleteClass(id: string): Promise<boolean> {
    const classes = await this.getAllClasses();
    const initialLength = classes.length;
    const filteredClasses = classes.filter(c => c.id !== id);
    
    if (filteredClasses.length === initialLength) {
      return false;
    }

    await this.writeJsonFile(this.classesFile, filteredClasses);
    return true;
  }

  // Rotation operations
  async getAllRotations(): Promise<Rotation[]> {
    return this.readJsonFile<Rotation>(this.rotationsFile);
  }

  async getRotationById(id: string): Promise<Rotation | null> {
    const rotations = await this.getAllRotations();
    return rotations.find(r => r.id === id) || null;
  }

  async saveRotation(rotation: Rotation): Promise<Rotation> {
    const rotations = await this.getAllRotations();
    const now = new Date();

    if (!rotation.id) {
      rotation.id = crypto.randomUUID();
      rotation.createdAt = now;
    }
    rotation.updatedAt = now;

    const existingIndex = rotations.findIndex(r => r.id === rotation.id);
    if (existingIndex >= 0) {
      rotations[existingIndex] = rotation;
    } else {
      rotations.push(rotation);
    }

    await this.writeJsonFile(this.rotationsFile, rotations);
    return rotation;
  }

  async deleteRotation(id: string): Promise<boolean> {
    const rotations = await this.getAllRotations();
    const initialLength = rotations.length;
    const filteredRotations = rotations.filter(r => r.id !== id);
    
    if (filteredRotations.length === initialLength) {
      return false;
    }

    await this.writeJsonFile(this.rotationsFile, filteredRotations);
    return true;
  }

  // Constraint operations
  async getConstraints(): Promise<ScheduleConstraints | null> {
    const constraints = await this.readJsonFile<ScheduleConstraints>(this.constraintsFile);
    return constraints[0] || null;
  }

  async saveConstraints(constraints: ScheduleConstraints): Promise<ScheduleConstraints> {
    await this.writeJsonFile(this.constraintsFile, [constraints]);
    return constraints;
  }
} 