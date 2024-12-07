import { Class, Conflict, GradeLevel, DayOfWeek } from '../../../shared/types';

interface RawClassData {
    classNumber: string;
    grade: string;
    conflicts: {
        [key: string]: number[];
    };
}

export class ClassDataConverter {
    private static dayNameToNumber: { [key: string]: DayOfWeek } = {
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5
    };

    private static parseGrade(classNumber: string): GradeLevel {
        if (classNumber.startsWith('PK')) return 'Pre-K';
        if (classNumber.startsWith('K-')) return 'K';
        if (classNumber.includes('/')) return 'multiple';
        const grade = classNumber.split('-')[0];
        return grade as GradeLevel;
    }

    private static convertConflicts(conflicts: { [key: string]: number[] }): Conflict[] {
        const convertedConflicts: Conflict[] = [];
        
        Object.entries(conflicts).forEach(([day, periods]) => {
            const dayOfWeek = this.dayNameToNumber[day];
            periods.forEach(period => {
                convertedConflicts.push({
                    dayOfWeek,
                    period: period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
                });
            });
        });

        return convertedConflicts;
    }

    public static convertToClass(rawData: RawClassData): Class {
        return {
            id: rawData.classNumber,  // Use classNumber as ID
            classNumber: rawData.classNumber,
            grade: this.parseGrade(rawData.classNumber),
            defaultConflicts: this.convertConflicts(rawData.conflicts),
            active: true
        };
    }

    public static parseScheduleText(scheduleText: string): Class[] {
        const classes: Class[] = [];
        let currentClass: RawClassData | null = null;
        
        const lines = scheduleText.split('\n');
        
        for (const line of lines) {
            if (line.trim().startsWith('Class ')) {
                // Start new class
                if (currentClass) {
                    classes.push(this.convertToClass(currentClass));
                }
                
                const classMatch = line.match(/Class (\S+)/);
                if (classMatch) {
                    currentClass = {
                        classNumber: classMatch[1],
                        grade: '',  // Will be determined from class number
                        conflicts: {
                            'Monday': [],
                            'Tuesday': [],
                            'Wednesday': [],
                            'Thursday': [],
                            'Friday': []
                        }
                    };
                }
            } else if (currentClass && line.trim()) {
                // Parse day and periods
                const dayMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday): Periods? ([\d, ]+)/);
                if (dayMatch) {
                    const [_, day, periodsStr] = dayMatch;
                    const periods = periodsStr.split(',').map(p => parseInt(p.trim()));
                    currentClass.conflicts[day] = periods;
                }
            }
        }
        
        // Add the last class
        if (currentClass) {
            classes.push(this.convertToClass(currentClass));
        }
        
        return classes;
    }
} 