import { Class } from '../../../shared/types';

export interface SortingCriteria {
  constraintCount: number;
  // Future criteria can be added here
}

export class SortingService {
  /**
   * Calculates sorting criteria for a class
   */
  public calculateClassSortingCriteria(classDoc: Class): SortingCriteria {
    return {
      constraintCount: classDoc.defaultConflicts.length,
    };
  }

  /**
   * Sorts classes by their constraints in descending order
   */
  public sortClassesByConstraints(classes: Class[]): Class[] {
    return [...classes].sort((a, b) => {
      const criteriaA = this.calculateClassSortingCriteria(a);
      const criteriaB = this.calculateClassSortingCriteria(b);
      return criteriaB.constraintCount - criteriaA.constraintCount;
    });
  }

  /**
   * Factory method to create different sorting strategies in the future
   */
  public static createSortingStrategy(type: 'constraint-based' = 'constraint-based'): SortingService {
    // In the future, we can add more sorting strategies here
    return new SortingService();
  }
}

// Export a convenience function for sorting by constraints
export const sortByConstraints = (classes: Class[]): Class[] => {
  const sorter = SortingService.createSortingStrategy();
  return sorter.sortClassesByConstraints(classes);
}; 