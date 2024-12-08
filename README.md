# School Scheduling System

## Project Overview
This project implements an automated class scheduling system for schools, capable of generating conflict-free schedules while respecting various constraints. The system provides an intuitive interface for managing class schedules and includes comprehensive testing with both synthetic and real-world data.

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- TypeScript 4.5+
- Python 3.8+ (for PDF parsing)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd school-scheduler
```

2. Run the setup script:
```bash
npm run setup
```
This will:
- Install dependencies for all packages (shared, backend, frontend)
- Create necessary directories
- Set up development environment

3. Create your environment configuration:
```bash
cp config/dev.env.example config/dev.env
```
Then edit `dev.env` with your specific settings.

### Development

Start all development servers:
```bash
npm run dev
```
This will start both backend and frontend servers concurrently.

Or start services individually:
```bash
# Start backend only
cd backend && npm run dev

# Start frontend only
cd frontend && npm run dev
```

### Building for Production

Build all packages:
```bash
npm run build
```

Or build packages individually:
```bash
npm run build:shared   # Build shared types
npm run build:backend  # Build backend
npm run build:frontend # Build frontend
```

## Project Structure
```
simple-scheduler/
├── backend/          # Backend server
│   ├── src/
│   │   ├── services/    # Core services
│   │   │   ├── scheduler/   # Scheduling logic
│   │   │   ├── pdf/        # PDF processing
│   │   │   └── storage/    # Data persistence
│   │   └── __tests__/     # Test files
├── frontend/        # Frontend application
├── shared/          # Shared types and utilities
├── docs/           # Documentation
│   ├── Technical/      # Technical documentation
│   ├── Features/       # Feature documentation
│   └── Development/    # Development guides
├── scripts/        # Development scripts
│   ├── setup.sh       # Project setup
│   ├── dev.sh         # Development servers
│   └── build.sh       # Build process
├── config/         # Configuration templates
└── README.md
```

## Current Status (Last Updated: Dec 7, 2023)

### Completed Features
- ✅ PDF schedule import functionality
- ✅ Manual class creation and editing
- ✅ Class data persistence with backup system
- ✅ Class conflict visualization and management
- ✅ Basic constraint management
- ✅ Frontend class selection and display
- ✅ Backend storage service with validation
- ✅ Dependency updates and modernization
- ✅ Visual blackout period management

### In Progress
- 🔄 Schedule generation algorithm implementation
- 🔄 Advanced constraint handling
- 🔄 Schedule optimization features
- 🔄 Quality metrics tracking

### Recent Updates
1. **Blackout Period Management** (Current)
   - Added visual calendar interface for managing blackout periods
   - Implemented drag-select functionality for blocking multiple periods
   - Added full day and cross-day period blocking
   - Included undo/redo functionality for constraint changes

2. **Manual Class Management** (Dec 7, 2023)
   - Added ability to manually create classes
   - Added class editing functionality
   - Improved class conflict management UI
   - Integrated with existing PDF import system

3. **Major Dependency Updates** (Dec 7, 2023)
   - Updated Next.js to version 15
   - Updated React to version 18 (stable)
   - Updated backend dependencies including Express
   - Fixed security vulnerabilities
   - Improved TypeScript compatibility

4. **PDF Import System**
   - Implemented PDF parsing with Python backend
   - Added error handling and validation
   - Integrated with frontend upload component

5. **UI Improvements**
   - Added scrollable class dropdown
   - Improved class conflict visualization
   - Fixed TypeScript type issues
   - Enhanced error handling and user feedback
   - Added form validation for class creation

## Features

### User Features
- Class Management:
  - Import classes via PDF upload
  - Manually create new classes
  - Edit existing classes
  - Manage class conflicts visually
- Constraint Management:
  - Visual blackout period calendar
  - Drag-select period blocking
  - Full day and cross-day blocking
  - Undo/redo capability
- Constraint-based scheduling
- Real-time schedule generation
- Schedule optimization
- Quality metrics tracking

## Known Issues and Limitations
1. PDF parsing may require specific format
2. Large schedules may take longer to process
3. UI updates needed for better mobile support

## Next Steps
1. Implement schedule generation algorithm
2. Add more advanced constraint types
3. Improve error handling in PDF parser
4. Add unit tests for storage service
5. Enhance backup/restore functionality

## API Documentation

### Endpoints

#### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create new class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `POST /api/classes/import` - Import PDF schedule
- `GET /api/classes/:id/conflicts` - Get class conflicts

#### Constraints
- `GET /api/constraints` - Get current constraints
- `PUT /api/constraints` - Update constraints
- `POST /api/constraints/validate` - Validate constraints
- `GET /api/constraints/templates` - Get constraint templates

#### Schedule
- `POST /api/schedule/generate` - Generate new schedule
- `GET /api/schedule/:id` - Get specific schedule
- `GET /api/schedule/current` - Get current schedule
- `POST /api/schedule/:id/optimize` - Optimize schedule
- `GET /api/schedule/status/:id` - Get generation status

## Contributing

When contributing, please:
1. Update relevant documentation
2. Add corresponding test cases
3. Ensure all existing tests pass
4. Follow the existing code style

For detailed technical documentation about the backend implementation, please refer to [backend/README.md](backend/README.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Documentation
- See [BLACKOUT_PERIODS.md](docs/BLACKOUT_PERIODS.md) for detailed documentation on blackout period functionality
- See [INTEGRATION.md](docs/INTEGRATION.md) for integration details
- See [TESTING.md](docs/TESTING.md) for testing guidelines