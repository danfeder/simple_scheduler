import { PDFParser, ValidationError, ClassInfo } from '../pdfParser';
import fs from 'fs';
import path from 'path';

describe('PDFParser', () => {
  describe('ClassInfo', () => {
    it('should create a valid class info object', () => {
      const classInfo = new ClassInfo('101', 'K-101');
      expect(classInfo.classNumber).toBe('101');
      expect(classInfo.grade).toBe('K');
      expect(classInfo.active).toBe(true);
      expect(classInfo.defaultConflicts).toHaveLength(0);
    });

    it('should validate class number format', () => {
      expect(() => new ClassInfo('10', 'K-101')).toThrow(ValidationError);
      expect(() => new ClassInfo('1001', 'K-101')).toThrow(ValidationError);
      expect(() => new ClassInfo('abc', 'K-101')).toThrow(ValidationError);
    });

    it('should validate room number format', () => {
      expect(() => new ClassInfo('101', 'K101')).toThrow(ValidationError);
      expect(() => new ClassInfo('101', '6-101')).toThrow(ValidationError);
      expect(() => new ClassInfo('101', 'invalid')).toThrow(ValidationError);
    });

    it('should correctly determine grade from room number', () => {
      expect(new ClassInfo('101', 'PK101').grade).toBe('Pre-K');
      expect(new ClassInfo('101', 'K-101').grade).toBe('K');
      expect(new ClassInfo('101', '1-101').grade).toBe('1');
      expect(new ClassInfo('101', 'K/1/2-101').grade).toBe('multiple');
    });

    it('should handle conflicts correctly', () => {
      const classInfo = new ClassInfo('101', 'K-101');
      
      // Add valid conflicts
      classInfo.addConflict(1, 1);
      classInfo.addConflict(2, 3);
      expect(classInfo.defaultConflicts).toHaveLength(2);
      
      // Should ignore duplicate conflicts
      classInfo.addConflict(1, 1);
      expect(classInfo.defaultConflicts).toHaveLength(2);
      
      // Should throw on invalid conflicts
      expect(() => classInfo.addConflict(0, 1)).toThrow(ValidationError);
      expect(() => classInfo.addConflict(6, 1)).toThrow(ValidationError);
      expect(() => classInfo.addConflict(1, 0)).toThrow(ValidationError);
      expect(() => classInfo.addConflict(1, 9)).toThrow(ValidationError);
    });

    it('should validate complete class info', () => {
      const classInfo = new ClassInfo('101', 'K-101');
      
      // Should throw on no conflicts
      expect(() => classInfo.validate()).toThrow(ValidationError);
      
      // Should pass with valid conflicts
      classInfo.addConflict(1, 1);
      classInfo.validate();
      
      // Should throw on too many conflicts per day
      // Add 9 conflicts for day 2 (some duplicates)
      for (let i = 0; i < 9; i++) {
        classInfo.addConflict(2, (i % 4) + 1); // Use periods 1-4 with duplicates
      }
      expect(() => classInfo.validate()).toThrow(ValidationError);
    });
  });

  describe('PDFParser', () => {
    it('should parse a valid PDF', async () => {
      const testPdfPath = path.join(__dirname, '../../../../../test_data/Master Schedule PDF 9.3.24..pdf');
      
      // Skip if test file doesn't exist
      if (!fs.existsSync(testPdfPath)) {
        console.warn(`Test PDF file not found at ${testPdfPath}, skipping test`);
        return;
      }

      console.log('Test PDF path:', testPdfPath);
      const pdfBuffer = fs.readFileSync(testPdfPath);
      console.log('PDF buffer size:', pdfBuffer.length, 'bytes');

      const classes = await PDFParser.parse(pdfBuffer);

      expect(classes).toHaveLength(33);
      
      // Check a few classes
      const firstClass = classes[0];
      expect(firstClass.classNumber).toMatch(/^\d{3}$/);
      expect(firstClass.defaultConflicts.length).toBeGreaterThan(0);
      
      // Verify grade distribution
      const grades = new Set(classes.map(c => c.grade));
      expect(grades.size).toBeGreaterThan(1);
      
      // Log some debug info
      console.log('\nFirst class parsed:', firstClass);
      console.log('\nGrade distribution:', Array.from(grades));
    });

    it('should throw on invalid PDF', async () => {
      const invalidBuffer = Buffer.from('not a pdf');
      await expect(PDFParser.parse(invalidBuffer)).rejects.toThrow();
    });
  });
}); 