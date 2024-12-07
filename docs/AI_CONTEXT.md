# AI Assistant Context Guide

## Project Overview
You are assisting with the development of a School Class Scheduler application that is being migrated and refactored. The project involves scheduling 33 classes (Pre-K to 5th Grade) per rotation while respecting various constraints and conflicts.

## Current Status
The following components have been completed:
1. File-based storage system using JSON
2. Hybrid Python/TypeScript PDF parser using pdfplumber
3. RESTful API layer with Express, Zod validation, and OpenAPI/Swagger documentation
4. Basic schedule generation logic

## Important Documents
To understand the project fully, please review these documents in order:
1. `ALGORITHM.md` - Original scheduling algorithm documentation
2. `docs/OPTIMIZATION_PLAN.md` - Current optimization plan and next steps
3. `ARCHITECTURE.md` - System architecture overview

## Key Concepts
1. **Schedule Generation**:
   - Follows a specific algorithm flow: initialize → sort → assign → backtrack → optimize
   - Must respect both hard and soft constraints
   - Uses backtracking when initial assignments fail

2. **Constraints**:
   - Hard constraints (must be satisfied): class conflicts, blackout dates, period limits
   - Soft constraints (optimization targets): grade sequencing, schedule density

3. **Optimization**:
   - Focuses on improving valid schedules
   - Considers multiple factors: grade sequence, density, teacher preferences
   - Must maintain performance while improving schedule quality

## Current Focus
We are currently working on enhancing the scheduling algorithm while maintaining its original logical flow. The optimization plan in `docs/OPTIMIZATION_PLAN.md` outlines the specific improvements we're implementing.

## Directory Structure
```
new-scheduler/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── models/
│   │   └── services/
│   └── python/
│       └── pdf_parser/
├── frontend/
├── shared/
└── docs/
    ├── ALGORITHM.md
    ├── OPTIMIZATION_PLAN.md
    └── AI_CONTEXT.md
```

## How to Assist
1. Always review the original algorithm documentation first
2. Ensure any suggested changes maintain the core algorithm flow
3. Reference the optimization plan for context on current improvements
4. Consider both functionality and performance implications
5. Maintain consistency with existing TypeScript/Python implementations

## Next Steps
The immediate focus is on implementing the optimization plan, which involves:
1. Enhancing the core algorithm while maintaining its original flow
2. Implementing the optimization layer for schedule improvement
3. Adding performance optimizations and caching
4. Developing comprehensive tests

When suggesting solutions or reviewing code:
1. Verify alignment with original algorithm flow
2. Check constraint handling completeness
3. Consider optimization opportunities
4. Evaluate performance implications
5. Ensure type safety and error handling 