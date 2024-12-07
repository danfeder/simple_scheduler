"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClassAvailable = isClassAvailable;
// Helper function to check class availability
function isClassAvailable(classDoc, date, period) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6)
        return false; // Weekend
    const schoolDayOfWeek = dayOfWeek;
    return !classDoc.defaultConflicts.some((conflict) => conflict.dayOfWeek === schoolDayOfWeek && conflict.period === period);
}
