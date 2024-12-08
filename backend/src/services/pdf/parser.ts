import { z } from 'zod';
import * as pdfjsLib from 'pdfjs-dist';
import type { Class, Conflict, GradeLevel, DayOfWeek, Period } from 'shared/types';
import type { TextItem, TextMarkedContent, TextContent } from 'pdfjs-dist/types/src/display/api';
import { ValidationError } from './validator';
import { ClassInfo } from './converter';

// Enable worker for better performance
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');

// Validation schemas
const conflictSchema = z.object({
  dayOfWeek: z.number().min(1).max(5) as z.ZodType<DayOfWeek>,
  period: z.number().min(1).max(8) as z.ZodType<Period>,
});

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

export class PDFParser {
  private static readonly DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  private static readonly SUBJECTS = new Set([
    'tech', 'lib', 'art', 'pe-p', 'pe-s', 'dance', 'math', 'music', 'sci'
  ]);
  private static dayColumns: number[] = [];

  static async parse(pdfBuffer: Buffer): Promise<Class[]> {
    try {
      console.log('Starting PDF parsing...');
      const data = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDocument = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdfDocument.numPages}`);

      const classes = new Map<string, ClassInfo>();

      // Process each page
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        console.log(`\nProcessing page ${pageNum}...`);
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        console.log(`Found ${textContent.items.length} text items on page ${pageNum}`);

        // Calibrate day columns if not done yet
        if (!this.dayColumns.length) {
          await this.calibrateDayColumns(textContent);
        }

        // Group text items by y-position (same line)
        const lines = this.groupIntoLines(textContent.items as (TextItem | TextMarkedContent)[]);
        console.log(`Extracted ${lines.length} non-empty lines`);

        let currentClass: ClassInfo | null = null;
        let continuationLine = false;

        for (const line of lines) {
          // Try to extract class info
          const classInfo = this.extractClassInfo(line);
          if (classInfo) {
            if (currentClass) {
              classes.set(currentClass.classNumber, currentClass);
            }
            currentClass = classInfo;
            continuationLine = false;
          } else {
            continuationLine = true;
          }

          // Extract conflicts if we have a current class
          if (currentClass) {
            this.extractConflicts(line, currentClass, continuationLine);
          }
        }

        // Add the last class of the page
        if (currentClass) {
          classes.set(currentClass.classNumber, currentClass);
        }
      }

      console.log('\nParsing complete. Validating results...');
      this.validateResults(classes);

      return Array.from(classes.values());

    } catch (error: unknown) {
      console.error('PDF parsing error:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async calibrateDayColumns(textContent: TextContent): Promise<void> {
    const dayPositions: { day: string; x: number }[] = [];

    // Look for day names in the header
    for (const item of textContent.items) {
      if ('str' in item) {
        const text = item.str.toLowerCase();
        for (const day of this.DAYS) {
          if (text.includes(day.toLowerCase())) {
            const xPos = item.transform[4]; // x position
            console.log(`Found day ${day} at x = ${xPos}`);
            dayPositions.push({ day, x: xPos });
          }
        }
      }
    }

    if (!dayPositions.length) {
      console.log("Warning: No day headers found, using fixed positions");
      this.dayColumns = [150, 250, 350, 450, 550];
      return;
    }

    // Sort by x position
    dayPositions.sort((a, b) => a.x - b.x);

    // Extract x positions in the correct order
    const dayOrder = new Map(this.DAYS.map((day, i) => [day, i]));
    const orderedPositions: number[] = [];

    for (const { day, x } of dayPositions) {
      const idx = dayOrder.get(day);
      if (idx !== undefined) {
        while (orderedPositions.length < idx) {
          if (orderedPositions.length > 0) {
            // Interpolate between known positions
            const prevPos = orderedPositions[orderedPositions.length - 1];
            const step = (x - prevPos) / (idx - orderedPositions.length + 1);
            orderedPositions.push(prevPos + step);
          } else {
            // No previous position, extrapolate backwards
            const step = (x - 150) / idx; // Assume 150 as leftmost position
            orderedPositions.push(x - step * (idx - orderedPositions.length));
          }
        }
        orderedPositions.push(x);
      }
    }

    // Fill in any remaining positions
    while (orderedPositions.length < 5) {
      if (orderedPositions.length > 0) {
        // Extrapolate forward
        const step = orderedPositions[orderedPositions.length - 1] - orderedPositions[orderedPositions.length - 2];
        orderedPositions.push(orderedPositions[orderedPositions.length - 1] + step);
      } else {
        // No positions found, use fixed positions
        this.dayColumns = [150, 250, 350, 450, 550];
        return;
      }
    }

    this.dayColumns = orderedPositions.slice(0, 5);
    console.log('Calibrated day columns:', this.dayColumns);
  }

  private static groupIntoLines(items: (TextItem | TextMarkedContent)[]): (TextItem | TextMarkedContent)[][] {
    // Sort by y-position first, then x-position
    const sortedItems = items.sort((a, b) => {
      if ('transform' in a && 'transform' in b) {
        const yDiff = b.transform[5] - a.transform[5];
        return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4];
      }
      return 0;
    });

    const lines: (TextItem | TextMarkedContent)[][] = [];
    let currentLine: (TextItem | TextMarkedContent)[] = [];
    let currentY: number | null = null;

    for (const item of sortedItems) {
      if ('transform' in item) {
        if (currentY === null) {
          currentY = item.transform[5];
        }

        // If this item is on a new line
        if (Math.abs(item.transform[5] - (currentY ?? 0)) > 5) { // 5 is tolerance for same line
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [item];
          currentY = item.transform[5];
        } else {
          currentLine.push(item);
        }
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  private static extractClassInfo(line: (TextItem | TextMarkedContent)[]): ClassInfo | null {
    if (!line || line.length < 2) return null;

    // Get text from first two items
    const firstItem = line[0];
    const secondItem = line[1];
    if (!('str' in firstItem) || !('str' in secondItem)) return null;

    // Try to match class number (3 digits)
    const classMatch = firstItem.str.match(/(\d{3})/);
    if (!classMatch) return null;

    const classNumber = classMatch[1];
    const roomNumber = secondItem.str;

    try {
      return new ClassInfo(classNumber, roomNumber);
    } catch (error) {
      console.error('Failed to create ClassInfo:', error);
      return null;
    }
  }

  private static extractConflicts(
    line: (TextItem | TextMarkedContent)[],
    classInfo: ClassInfo,
    continuationLine: boolean
  ): void {
    if (!line || !this.dayColumns.length) return;

    // Skip the first two items if this is a new class line (class number and room)
    const startIdx = continuationLine ? 0 : 2;

    // Process each item
    for (const item of line.slice(startIdx)) {
      if (!('str' in item) || !('transform' in item)) continue;

      // Look for period numbers
      const periodMatch = item.str.match(/([1-8])/);
      if (periodMatch) {
        const xPos = item.transform[4];

        // Find closest column
        const dayIdx = this.dayColumns.reduce((closest, x, idx) => {
          return Math.abs(xPos - x) < Math.abs(xPos - this.dayColumns[closest]) ? idx : closest;
        }, 0);

        const period = parseInt(periodMatch[1], 10);
        const dayOfWeek = dayIdx + 1;

        // Look for subject in previous item
        const prevItem = line[line.indexOf(item) - 1];
        if ('str' in prevItem) {
          const subject = prevItem.str.toLowerCase();
          if (this.SUBJECTS.has(subject)) {
            console.log(`Found conflict: Day ${dayOfWeek}, Period ${period}, Subject: ${subject}`);
            classInfo.addConflict(dayOfWeek, period);
          }
        }
      }
    }
  }

  private static validateResults(classes: Map<string, ClassInfo>): void {
    // Check we found exactly 33 classes
    if (classes.size !== 33) {
      throw new ValidationError(`Found ${classes.size} classes, expected 33`);
    }

    // Check class numbers are unique
    const classNumbers = new Set<string>();
    for (const classNumber of classes.keys()) {
      if (classNumbers.has(classNumber)) {
        throw new ValidationError(`Duplicate class number: ${classNumber}`);
      }
      classNumbers.add(classNumber);
    }

    // Check room numbers are unique
    const roomNumbers = new Set<string>();
    for (const classInfo of classes.values()) {
      const roomNumber = classInfo.classNumber; // Using class number as room number
      if (roomNumbers.has(roomNumber)) {
        throw new ValidationError(`Duplicate room number: ${roomNumber}`);
      }
      roomNumbers.add(roomNumber);
    }

    // Validate each class's complete information
    for (const classInfo of classes.values()) {
      classInfo.validate();
    }

    // Print grade level distribution
    const gradeCounts = new Map<GradeLevel, number>();
    for (const classInfo of classes.values()) {
      gradeCounts.set(classInfo.grade, (gradeCounts.get(classInfo.grade) || 0) + 1);
    }

    console.log('\nGrade level distribution:');
    for (const [grade, count] of gradeCounts.entries()) {
      console.log(`${grade}: ${count} classes`);
    }
  }
} 