"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClassAvailable = void 0;
// Helper functions for availability checking
const isClassAvailable = (classDoc, date, period) => {
    const dayOfWeek = (date.getDay() || 7); // Convert Sunday (0) to 7
    // Check if this period conflicts with any default conflicts
    return !classDoc.defaultConflicts.some(conflict => conflict.dayOfWeek === dayOfWeek && conflict.period === period);
};
exports.isClassAvailable = isClassAvailable;
