"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
var types_1 = require("../../../shared/types");
var storage_1 = require("./storage");
var sorting_1 = require("./sorting");
var SchedulerService = /** @class */ (function () {
    function SchedulerService(startDate, constraints) {
        this.schedule = [];
        this.classes = [];
        this.availabilityMap = new Map();
        this.startDate = startDate;
        this.constraints = constraints;
        this.storage = new storage_1.StorageService();
        this.sortingService = sorting_1.SortingService.createSortingStrategy();
    }
    SchedulerService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Get all active classes
                        _a = this;
                        return [4 /*yield*/, this.storage.getAllClasses()];
                    case 1:
                        // Get all active classes
                        _a.classes = (_b.sent()).filter(function (c) { return c.active; });
                        this.schedule = [];
                        // Initialize availability map
                        return [4 /*yield*/, this.initializeAvailabilityMap()];
                    case 2:
                        // Initialize availability map
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SchedulerService.prototype.initializeAvailabilityMap = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentDate, daysToSchedule, day, dateKey, dayMap, _loop_1, this_1, _i, _a, period;
            return __generator(this, function (_b) {
                this.availabilityMap.clear();
                currentDate = new Date(this.startDate);
                daysToSchedule = 30;
                // Pre-compute availability for the next 30 days
                for (day = 0; day < daysToSchedule; day++) {
                    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                        currentDate = this.getNextWeekday(currentDate);
                        continue;
                    }
                    dateKey = currentDate.toISOString().split('T')[0];
                    dayMap = new Map();
                    _loop_1 = function (period) {
                        // Check blackout periods
                        var isBlackout = this_1.constraints.blackoutPeriods.some(function (blackout) {
                            return blackout.date.getTime() === currentDate.getTime() &&
                                blackout.period === period;
                        });
                        // Get conflicts for this slot
                        var conflicts = this_1.classes
                            .filter(function (c) { return !(0, types_1.isClassAvailable)(c, currentDate, period); })
                            .map(function (c) { return c.id; })
                            .filter(Boolean); // Filter out any undefined IDs
                        // Calculate initial score (can be enhanced later)
                        var score = this_1.calculateSlotScore(currentDate, period);
                        dayMap.set(period, {
                            isAvailable: !isBlackout && conflicts.length === 0,
                            conflicts: conflicts,
                            blackout: isBlackout,
                            score: score
                        });
                    };
                    this_1 = this;
                    // Initialize each period for this day
                    for (_i = 0, _a = Array.from({ length: 8 }, function (_, i) { return (i + 1); }); _i < _a.length; _i++) {
                        period = _a[_i];
                        _loop_1(period);
                    }
                    this.availabilityMap.set(dateKey, dayMap);
                    currentDate = this.getNextWeekday(currentDate);
                }
                return [2 /*return*/];
            });
        });
    };
    SchedulerService.prototype.calculateSlotScore = function (date, period) {
        // Initial basic scoring - can be enhanced based on:
        // - Distance from preferred periods
        // - Grade sequencing
        // - Schedule density
        var score = 1.0;
        // Prefer earlier dates
        var daysDiff = Math.floor((date.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
        score -= daysDiff * 0.01;
        // Prefer middle-of-day periods
        var periodPreference = 1 - Math.abs(period - 4.5) / 8;
        score += periodPreference;
        return Math.max(0, score);
    };
    SchedulerService.prototype.getSlotFromMap = function (date, period) {
        var dateKey = date.toISOString().split('T')[0];
        var dayMap = this.availabilityMap.get(dateKey);
        if (!dayMap)
            return null;
        return dayMap.get(period) || null;
    };
    SchedulerService.prototype.getNextWeekday = function (date) {
        var nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        return nextDay;
    };
    SchedulerService.prototype.findAvailableSlot = function (classDoc, currentDate, scheduledPeriodsToday, scheduledPeriodsThisWeek) {
        return __awaiter(this, void 0, void 0, function () {
            var date, slots, attempts, maxAttempts, dateKey, dayMap, availablePeriods, _i, availablePeriods_1, period;
            var _this = this;
            return __generator(this, function (_a) {
                date = new Date(currentDate);
                slots = [];
                attempts = 0;
                maxAttempts = 20;
                while (attempts < maxAttempts) {
                    if (date.getDay() === 1) {
                        scheduledPeriodsThisWeek.clear();
                    }
                    if (date.getTime() !== currentDate.getTime()) {
                        scheduledPeriodsToday.clear();
                    }
                    dateKey = date.toISOString().split('T')[0];
                    dayMap = this.availabilityMap.get(dateKey);
                    if (dayMap) {
                        availablePeriods = Array.from(dayMap.entries())
                            .filter(function (_a) {
                            var period = _a[0], cell = _a[1];
                            return cell.isAvailable &&
                                !cell.conflicts.includes(classDoc.id) &&
                                _this.meetsConstraints(classDoc, date, period, scheduledPeriodsToday, scheduledPeriodsThisWeek);
                        })
                            .sort(function (_a, _b) {
                            var _ = _a[0], a = _a[1];
                            var __ = _b[0], b = _b[1];
                            return b.score - a.score;
                        });
                        // Add all available slots for this date
                        for (_i = 0, availablePeriods_1 = availablePeriods; _i < availablePeriods_1.length; _i++) {
                            period = availablePeriods_1[_i][0];
                            slots.push({ date: new Date(date), period: period });
                        }
                    }
                    date = this.getNextWeekday(date);
                    attempts++;
                }
                return [2 /*return*/, slots];
            });
        });
    };
    SchedulerService.prototype.saveBacktrackingState = function (classIndex, schedule, scheduledPeriodsToday, scheduledPeriodsThisWeek) {
        return {
            classIndex: classIndex,
            schedule: __spreadArray([], schedule, true),
            scheduledPeriodsToday: new Map(scheduledPeriodsToday),
            scheduledPeriodsThisWeek: new Map(scheduledPeriodsThisWeek)
        };
    };
    SchedulerService.prototype.restoreBacktrackingState = function (state) {
        this.schedule = __spreadArray([], state.schedule, true);
    };
    SchedulerService.prototype.scheduleWithBacktracking = function (sortedClasses_1, currentDate_1) {
        return __awaiter(this, arguments, void 0, function (sortedClasses, currentDate, maxBacktracks) {
            var backtrackingStack, currentClassIndex, backtracks, scheduledPeriodsToday, scheduledPeriodsThisWeek, classDoc, availableSlots, slot, classId, previousState;
            if (maxBacktracks === void 0) { maxBacktracks = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        backtrackingStack = [];
                        currentClassIndex = 0;
                        backtracks = 0;
                        scheduledPeriodsToday = new Map();
                        scheduledPeriodsThisWeek = new Map();
                        _a.label = 1;
                    case 1:
                        if (!(currentClassIndex < sortedClasses.length)) return [3 /*break*/, 3];
                        classDoc = sortedClasses[currentClassIndex];
                        return [4 /*yield*/, this.findAvailableSlot(classDoc, currentDate, scheduledPeriodsToday, scheduledPeriodsThisWeek)];
                    case 2:
                        availableSlots = _a.sent();
                        if (availableSlots.length > 0) {
                            slot = availableSlots[0];
                            // Save state before assignment
                            backtrackingStack.push(this.saveBacktrackingState(currentClassIndex, this.schedule, scheduledPeriodsToday, scheduledPeriodsThisWeek));
                            classId = classDoc.id;
                            scheduledPeriodsToday.set(classId, (scheduledPeriodsToday.get(classId) || 0) + 1);
                            scheduledPeriodsThisWeek.set(classId, (scheduledPeriodsThisWeek.get(classId) || 0) + 1);
                            this.schedule.push({
                                classId: classId,
                                assignedDate: slot.date,
                                period: slot.period,
                            });
                            currentClassIndex++;
                        }
                        else if (backtrackingStack.length > 0 && backtracks < maxBacktracks) {
                            previousState = backtrackingStack.pop();
                            this.restoreBacktrackingState(previousState);
                            currentClassIndex = previousState.classIndex;
                            backtracks++;
                        }
                        else {
                            return [2 /*return*/, false]; // Failed to find a valid schedule
                        }
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/, true];
                }
            });
        });
    };
    SchedulerService.prototype.meetsConstraints = function (classDoc, date, period, scheduledPeriodsToday, scheduledPeriodsThisWeek) {
        var classId = classDoc.id;
        var periodsToday = scheduledPeriodsToday.get(classId) || 0;
        var periodsThisWeek = scheduledPeriodsThisWeek.get(classId) || 0;
        // Check maximum periods per day
        if (periodsToday >= this.constraints.maxPeriodsPerDay)
            return false;
        // Check maximum periods per week
        if (periodsThisWeek >= this.constraints.maxPeriodsPerWeek)
            return false;
        // Check consecutive periods constraint
        if (this.constraints.avoidConsecutivePeriods) {
            var hasAdjacentPeriod = this.schedule.some(function (entry) {
                if (entry.assignedDate.getTime() !== date.getTime())
                    return false;
                return Math.abs(entry.period - period) === 1;
            });
            if (hasAdjacentPeriod)
                return false;
        }
        return true;
    };
    SchedulerService.prototype.calculateClassSortingCriteria = function (classDoc) {
        // Calculate total number of blocked periods (conflicts)
        var constraintCount = classDoc.defaultConflicts.length;
        return { constraintCount: constraintCount };
    };
    SchedulerService.prototype.sortClassesByConstraints = function (classes) {
        return this.sortingService.sortClassesByConstraints(classes);
    };
    SchedulerService.prototype.generateSchedule = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sortedClasses, currentDate, success;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        sortedClasses = this.sortClassesByConstraints(this.classes);
                        currentDate = new Date(this.startDate);
                        return [4 /*yield*/, this.scheduleWithBacktracking(sortedClasses, currentDate)];
                    case 2:
                        success = _a.sent();
                        if (!success) {
                            throw new Error('Unable to generate a valid schedule after backtracking');
                        }
                        return [2 /*return*/, this.schedule];
                }
            });
        });
    };
    SchedulerService.prototype.saveRotation = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.saveRotation({
                            startDate: this.startDate,
                            schedule: this.schedule,
                            status: 'draft',
                            additionalConflicts: []
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SchedulerService;
}());
exports.SchedulerService = SchedulerService;
