"use strict";
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
exports.SortingService = void 0;
var SortingService = /** @class */ (function () {
    function SortingService() {
    }
    /**
     * Calculates sorting criteria for a class
     */
    SortingService.prototype.calculateClassSortingCriteria = function (classDoc) {
        return {
            constraintCount: classDoc.defaultConflicts.length,
        };
    };
    /**
     * Sorts classes by their constraints in descending order
     */
    SortingService.prototype.sortClassesByConstraints = function (classes) {
        var _this = this;
        return __spreadArray([], classes, true).sort(function (a, b) {
            var criteriaA = _this.calculateClassSortingCriteria(a);
            var criteriaB = _this.calculateClassSortingCriteria(b);
            return criteriaB.constraintCount - criteriaA.constraintCount;
        });
    };
    /**
     * Factory method to create different sorting strategies in the future
     */
    SortingService.createSortingStrategy = function (type) {
        if (type === void 0) { type = 'constraint-based'; }
        // In the future, we can add more sorting strategies here
        return new SortingService();
    };
    return SortingService;
}());
exports.SortingService = SortingService;
