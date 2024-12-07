"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFParser = exports.ClassInfo = exports.ValidationError = void 0;
var zod_1 = require("zod");
var pdfjsLib = __importStar(require("pdfjs-dist"));
// Enable worker for better performance
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');
// Validation schemas
var conflictSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().min(1).max(5),
    period: zod_1.z.number().min(1).max(8),
});
var classNumberPatterns = {
    'Pre-K': /^PK\d{3}$/,
    'K': /^K-\d{3}$/,
    '1': /^1-\d{3}$/,
    '2': /^2-\d{3}$/,
    '3': /^3-\d{3}$/,
    '4': /^4-\d{3}$/,
    '5': /^5-\d{3}$/,
    'multiple': /^([K1-5]\/)+[K1-5]-\d{3}$/,
};
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ValidationError';
        return _this;
    }
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
var ClassInfo = /** @class */ (function () {
    function ClassInfo(classNumber, roomNumber) {
        this.validateClassNumber(classNumber);
        this.validateRoomNumber(roomNumber);
        this.classNumber = classNumber;
        this.grade = this.getGradeFromRoom(roomNumber);
        this.defaultConflicts = [];
        this.active = true;
        this.allConflicts = new Set();
    }
    ClassInfo.prototype.validateClassNumber = function (classNumber) {
        if (!/^\d{3}$/.test(classNumber)) {
            throw new ValidationError("Invalid class number format: ".concat(classNumber));
        }
    };
    ClassInfo.prototype.validateRoomNumber = function (roomNumber) {
        var validFormats = [
            /^PK\d{3}$/, // Pre-K rooms
            /^K-\d{3}$/, // Kindergarten rooms
            /^\d-\d{3}$/, // Grade 1-5 rooms
            /^[K1-5]\/[K1-5]\/[K1-5]-\d{3}$/ // Multiple grade rooms
        ];
        if (!validFormats.some(function (pattern) { return pattern.test(roomNumber); })) {
            throw new ValidationError("Invalid room number format: ".concat(roomNumber));
        }
    };
    ClassInfo.prototype.getGradeFromRoom = function (roomNumber) {
        if (roomNumber.startsWith('PK'))
            return 'Pre-K';
        if (roomNumber.startsWith('K-'))
            return 'K';
        if (roomNumber.includes('/'))
            return 'multiple';
        var grade = roomNumber.split('-')[0];
        if (['1', '2', '3', '4', '5'].includes(grade)) {
            return grade;
        }
        throw new ValidationError("Invalid grade in room number: ".concat(roomNumber));
    };
    ClassInfo.prototype.addConflict = function (dayOfWeek, period) {
        // Validate inputs
        if (dayOfWeek < 1 || dayOfWeek > 5) {
            throw new ValidationError("Invalid day of week: ".concat(dayOfWeek));
        }
        if (period < 1 || period > 8) {
            throw new ValidationError("Invalid period: ".concat(period));
        }
        // Check for duplicates
        var conflictKey = "".concat(dayOfWeek, "-").concat(period);
        if (this.allConflicts.has(conflictKey)) {
            return; // Skip duplicates silently
        }
        this.allConflicts.add(conflictKey);
        this.defaultConflicts.push({
            dayOfWeek: dayOfWeek,
            period: period
        });
    };
    ClassInfo.prototype.validate = function () {
        // Validate grade matches room number pattern
        var pattern = classNumberPatterns[this.grade];
        if (!pattern) {
            throw new ValidationError("Invalid grade level: ".concat(this.grade));
        }
        // Validate we have at least one conflict
        if (this.defaultConflicts.length === 0) {
            throw new ValidationError("Class ".concat(this.classNumber, " has no conflicts"));
        }
        // Validate no more than 8 conflicts per day
        var conflictsPerDay = new Map();
        for (var _i = 0, _a = this.defaultConflicts; _i < _a.length; _i++) {
            var conflict = _a[_i];
            var count = (conflictsPerDay.get(conflict.dayOfWeek) || 0) + 1;
            if (count > 8) {
                throw new ValidationError("Class ".concat(this.classNumber, " has more than 8 conflicts on day ").concat(conflict.dayOfWeek));
            }
            conflictsPerDay.set(conflict.dayOfWeek, count);
        }
    };
    return ClassInfo;
}());
exports.ClassInfo = ClassInfo;
var PDFParser = /** @class */ (function () {
    function PDFParser() {
    }
    PDFParser.parse = function (pdfBuffer) {
        return __awaiter(this, void 0, void 0, function () {
            var data, loadingTask, pdfDocument, classes, pageNum, page, textContent, lines, currentClass, continuationLine, _i, lines_1, line, classInfo, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        console.log('Starting PDF parsing...');
                        data = new Uint8Array(pdfBuffer);
                        loadingTask = pdfjsLib.getDocument({ data: data });
                        return [4 /*yield*/, loadingTask.promise];
                    case 1:
                        pdfDocument = _a.sent();
                        console.log("PDF loaded successfully. Pages: ".concat(pdfDocument.numPages));
                        classes = new Map();
                        pageNum = 1;
                        _a.label = 2;
                    case 2:
                        if (!(pageNum <= pdfDocument.numPages)) return [3 /*break*/, 8];
                        console.log("\nProcessing page ".concat(pageNum, "..."));
                        return [4 /*yield*/, pdfDocument.getPage(pageNum)];
                    case 3:
                        page = _a.sent();
                        return [4 /*yield*/, page.getTextContent()];
                    case 4:
                        textContent = _a.sent();
                        console.log("Found ".concat(textContent.items.length, " text items on page ").concat(pageNum));
                        if (!!this.dayColumns.length) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.calibrateDayColumns(textContent)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        lines = this.groupIntoLines(textContent.items);
                        console.log("Extracted ".concat(lines.length, " non-empty lines"));
                        currentClass = null;
                        continuationLine = false;
                        for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            line = lines_1[_i];
                            classInfo = this.extractClassInfo(line);
                            if (classInfo) {
                                if (currentClass) {
                                    classes.set(currentClass.classNumber, currentClass);
                                }
                                currentClass = classInfo;
                                continuationLine = false;
                            }
                            else {
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
                        _a.label = 7;
                    case 7:
                        pageNum++;
                        return [3 /*break*/, 2];
                    case 8:
                        console.log('\nParsing complete. Validating results...');
                        this.validateResults(classes);
                        return [2 /*return*/, Array.from(classes.values())];
                    case 9:
                        error_1 = _a.sent();
                        console.error('PDF parsing error:', error_1);
                        if (error_1 instanceof ValidationError) {
                            throw error_1;
                        }
                        throw new Error("Failed to parse PDF: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    PDFParser.calibrateDayColumns = function (textContent) {
        return __awaiter(this, void 0, void 0, function () {
            var dayPositions, _i, _a, item, text, _b, _c, day, xPos, dayOrder, orderedPositions, _d, dayPositions_1, _e, day, x, idx, prevPos, step, step, step;
            return __generator(this, function (_f) {
                dayPositions = [];
                // Look for day names in the header
                for (_i = 0, _a = textContent.items; _i < _a.length; _i++) {
                    item = _a[_i];
                    if ('str' in item) {
                        text = item.str.toLowerCase();
                        for (_b = 0, _c = this.DAYS; _b < _c.length; _b++) {
                            day = _c[_b];
                            if (text.includes(day.toLowerCase())) {
                                xPos = item.transform[4];
                                console.log("Found day ".concat(day, " at x = ").concat(xPos));
                                dayPositions.push({ day: day, x: xPos });
                            }
                        }
                    }
                }
                if (!dayPositions.length) {
                    console.log("Warning: No day headers found, using fixed positions");
                    this.dayColumns = [150, 250, 350, 450, 550];
                    return [2 /*return*/];
                }
                // Sort by x position
                dayPositions.sort(function (a, b) { return a.x - b.x; });
                dayOrder = new Map(this.DAYS.map(function (day, i) { return [day, i]; }));
                orderedPositions = [];
                for (_d = 0, dayPositions_1 = dayPositions; _d < dayPositions_1.length; _d++) {
                    _e = dayPositions_1[_d], day = _e.day, x = _e.x;
                    idx = dayOrder.get(day);
                    if (idx !== undefined) {
                        while (orderedPositions.length < idx) {
                            if (orderedPositions.length > 0) {
                                prevPos = orderedPositions[orderedPositions.length - 1];
                                step = (x - prevPos) / (idx - orderedPositions.length + 1);
                                orderedPositions.push(prevPos + step);
                            }
                            else {
                                step = (x - 150) / idx;
                                orderedPositions.push(x - step * (idx - orderedPositions.length));
                            }
                        }
                        orderedPositions.push(x);
                    }
                }
                // Fill in any remaining positions
                while (orderedPositions.length < 5) {
                    if (orderedPositions.length > 0) {
                        step = orderedPositions[orderedPositions.length - 1] - orderedPositions[orderedPositions.length - 2];
                        orderedPositions.push(orderedPositions[orderedPositions.length - 1] + step);
                    }
                    else {
                        // No positions found, use fixed positions
                        this.dayColumns = [150, 250, 350, 450, 550];
                        return [2 /*return*/];
                    }
                }
                this.dayColumns = orderedPositions.slice(0, 5);
                console.log('Calibrated day columns:', this.dayColumns);
                return [2 /*return*/];
            });
        });
    };
    PDFParser.groupIntoLines = function (items) {
        // Sort by y-position first, then x-position
        var sortedItems = items.sort(function (a, b) {
            if ('transform' in a && 'transform' in b) {
                var yDiff = b.transform[5] - a.transform[5];
                return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4];
            }
            return 0;
        });
        var lines = [];
        var currentLine = [];
        var currentY = null;
        for (var _i = 0, sortedItems_1 = sortedItems; _i < sortedItems_1.length; _i++) {
            var item = sortedItems_1[_i];
            if ('transform' in item) {
                if (currentY === null) {
                    currentY = item.transform[5];
                }
                // If this item is on a new line
                if (Math.abs(item.transform[5] - (currentY !== null && currentY !== void 0 ? currentY : 0)) > 5) { // 5 is tolerance for same line
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                    }
                    currentLine = [item];
                    currentY = item.transform[5];
                }
                else {
                    currentLine.push(item);
                }
            }
        }
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        return lines;
    };
    PDFParser.extractClassInfo = function (line) {
        if (!line || line.length < 2)
            return null;
        // Get text from first two items
        var firstItem = line[0];
        var secondItem = line[1];
        if (!('str' in firstItem) || !('str' in secondItem))
            return null;
        // Try to match class number (3 digits)
        var classMatch = firstItem.str.match(/(\d{3})/);
        if (!classMatch)
            return null;
        var classNumber = classMatch[1];
        var roomNumber = secondItem.str;
        try {
            return new ClassInfo(classNumber, roomNumber);
        }
        catch (error) {
            console.error('Failed to create ClassInfo:', error);
            return null;
        }
    };
    PDFParser.extractConflicts = function (line, classInfo, continuationLine) {
        var _this = this;
        if (!line || !this.dayColumns.length)
            return;
        // Skip the first two items if this is a new class line (class number and room)
        var startIdx = continuationLine ? 0 : 2;
        var _loop_1 = function (item) {
            if (!('str' in item) || !('transform' in item))
                return "continue";
            // Look for period numbers
            var periodMatch = item.str.match(/([1-8])/);
            if (periodMatch) {
                var xPos_1 = item.transform[4];
                // Find closest column
                var dayIdx = this_1.dayColumns.reduce(function (closest, x, idx) {
                    return Math.abs(xPos_1 - x) < Math.abs(xPos_1 - _this.dayColumns[closest]) ? idx : closest;
                }, 0);
                var period = parseInt(periodMatch[1], 10);
                var dayOfWeek = dayIdx + 1;
                // Look for subject in previous item
                var prevItem = line[line.indexOf(item) - 1];
                if ('str' in prevItem) {
                    var subject = prevItem.str.toLowerCase();
                    if (this_1.SUBJECTS.has(subject)) {
                        console.log("Found conflict: Day ".concat(dayOfWeek, ", Period ").concat(period, ", Subject: ").concat(subject));
                        classInfo.addConflict(dayOfWeek, period);
                    }
                }
            }
        };
        var this_1 = this;
        // Process each item
        for (var _i = 0, _a = line.slice(startIdx); _i < _a.length; _i++) {
            var item = _a[_i];
            _loop_1(item);
        }
    };
    PDFParser.validateResults = function (classes) {
        // Check we found exactly 33 classes
        if (classes.size !== 33) {
            throw new ValidationError("Found ".concat(classes.size, " classes, expected 33"));
        }
        // Check class numbers are unique
        var classNumbers = new Set();
        for (var _i = 0, _a = classes.keys(); _i < _a.length; _i++) {
            var classNumber = _a[_i];
            if (classNumbers.has(classNumber)) {
                throw new ValidationError("Duplicate class number: ".concat(classNumber));
            }
            classNumbers.add(classNumber);
        }
        // Check room numbers are unique
        var roomNumbers = new Set();
        for (var _b = 0, _c = classes.values(); _b < _c.length; _b++) {
            var classInfo = _c[_b];
            var roomNumber = classInfo.classNumber; // Using class number as room number
            if (roomNumbers.has(roomNumber)) {
                throw new ValidationError("Duplicate room number: ".concat(roomNumber));
            }
            roomNumbers.add(roomNumber);
        }
        // Validate each class's complete information
        for (var _d = 0, _e = classes.values(); _d < _e.length; _d++) {
            var classInfo = _e[_d];
            classInfo.validate();
        }
        // Print grade level distribution
        var gradeCounts = new Map();
        for (var _f = 0, _g = classes.values(); _f < _g.length; _f++) {
            var classInfo = _g[_f];
            gradeCounts.set(classInfo.grade, (gradeCounts.get(classInfo.grade) || 0) + 1);
        }
        console.log('\nGrade level distribution:');
        for (var _h = 0, _j = gradeCounts.entries(); _h < _j.length; _h++) {
            var _k = _j[_h], grade = _k[0], count = _k[1];
            console.log("".concat(grade, ": ").concat(count, " classes"));
        }
    };
    PDFParser.DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    PDFParser.SUBJECTS = new Set([
        'tech', 'lib', 'art', 'pe-p', 'pe-s', 'dance', 'math', 'music', 'sci'
    ]);
    PDFParser.dayColumns = [];
    return PDFParser;
}());
exports.PDFParser = PDFParser;
