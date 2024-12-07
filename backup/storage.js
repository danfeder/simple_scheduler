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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
var promises_1 = __importDefault(require("fs/promises"));
var path_1 = __importDefault(require("path"));
var StorageService = /** @class */ (function () {
    function StorageService() {
        this.dataDir = path_1.default.join(process.cwd(), 'data');
        this.classesFile = path_1.default.join(this.dataDir, 'classes.json');
        this.rotationsFile = path_1.default.join(this.dataDir, 'rotations.json');
    }
    StorageService.prototype.ensureDataDir = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, promises_1.default.access(this.dataDir)];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        _a = _b.sent();
                        return [4 /*yield*/, promises_1.default.mkdir(this.dataDir, { recursive: true })];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.readJsonFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, promises_1.default.readFile(filePath, 'utf-8')];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, JSON.parse(data)];
                    case 2:
                        error_1 = _a.sent();
                        if (error_1.code === 'ENOENT') {
                            return [2 /*return*/, []];
                        }
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.writeJsonFile = function (filePath, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureDataDir()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, promises_1.default.writeFile(filePath, JSON.stringify(data, null, 2))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Class operations
    StorageService.prototype.getAllClasses = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.readJsonFile(this.classesFile)];
            });
        });
    };
    StorageService.prototype.getClassById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var classes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllClasses()];
                    case 1:
                        classes = _a.sent();
                        return [2 /*return*/, classes.find(function (c) { return c.id === id; }) || null];
                }
            });
        });
    };
    StorageService.prototype.saveClass = function (classData) {
        return __awaiter(this, void 0, void 0, function () {
            var classes, now, existingIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllClasses()];
                    case 1:
                        classes = _a.sent();
                        now = new Date();
                        if (!classData.id) {
                            classData.id = crypto.randomUUID();
                            classData.createdAt = now;
                        }
                        classData.updatedAt = now;
                        existingIndex = classes.findIndex(function (c) { return c.id === classData.id; });
                        if (existingIndex >= 0) {
                            classes[existingIndex] = classData;
                        }
                        else {
                            classes.push(classData);
                        }
                        return [4 /*yield*/, this.writeJsonFile(this.classesFile, classes)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, classData];
                }
            });
        });
    };
    StorageService.prototype.deleteClass = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var classes, initialLength, filteredClasses;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllClasses()];
                    case 1:
                        classes = _a.sent();
                        initialLength = classes.length;
                        filteredClasses = classes.filter(function (c) { return c.id !== id; });
                        if (filteredClasses.length === initialLength) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.writeJsonFile(this.classesFile, filteredClasses)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    // Rotation operations
    StorageService.prototype.getAllRotations = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.readJsonFile(this.rotationsFile)];
            });
        });
    };
    StorageService.prototype.getRotationById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var rotations;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllRotations()];
                    case 1:
                        rotations = _a.sent();
                        return [2 /*return*/, rotations.find(function (r) { return r.id === id; }) || null];
                }
            });
        });
    };
    StorageService.prototype.saveRotation = function (rotation) {
        return __awaiter(this, void 0, void 0, function () {
            var rotations, now, existingIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllRotations()];
                    case 1:
                        rotations = _a.sent();
                        now = new Date();
                        if (!rotation.id) {
                            rotation.id = crypto.randomUUID();
                            rotation.createdAt = now;
                        }
                        rotation.updatedAt = now;
                        existingIndex = rotations.findIndex(function (r) { return r.id === rotation.id; });
                        if (existingIndex >= 0) {
                            rotations[existingIndex] = rotation;
                        }
                        else {
                            rotations.push(rotation);
                        }
                        return [4 /*yield*/, this.writeJsonFile(this.rotationsFile, rotations)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, rotation];
                }
            });
        });
    };
    StorageService.prototype.deleteRotation = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var rotations, initialLength, filteredRotations;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllRotations()];
                    case 1:
                        rotations = _a.sent();
                        initialLength = rotations.length;
                        filteredRotations = rotations.filter(function (r) { return r.id !== id; });
                        if (filteredRotations.length === initialLength) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.writeJsonFile(this.rotationsFile, filteredRotations)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return StorageService;
}());
exports.StorageService = StorageService;
