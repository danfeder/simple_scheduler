# School Scheduling System

## Project Overview
This project implements an automated class scheduling system for schools, capable of generating conflict-free schedules while respecting various constraints. The system provides an intuitive interface for managing class schedules and includes comprehensive testing with both synthetic and real-world data.

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

### In Progress
- 🔄 Schedule generation algorithm implementation
- 🔄 Advanced constraint handling
- 🔄 Schedule optimization features
- 🔄 Quality metrics tracking

### Recent Updates
1. **Manual Class Management** (Dec 7, 2023)
   - Added ability to manually create classes
   - Added class editing functionality
   - Improved class conflict management UI
   - Integrated with existing PDF import system

2. **Major Dependency Updates** (Dec 7, 2023)
   - Updated Next.js to version 15
   - Updated React to version 18 (stable)
   - Updated backend dependencies including Express
   - Fixed security vulnerabilities
   - Improved TypeScript compatibility

3. **PDF Import System**
   - Implemented PDF parsing with Python backend
   - Added error handling and validation
   - Integrated with frontend upload component

4. **UI Improvements**
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
- Constraint-based scheduling
- Real-time schedule generation
- Schedule optimization
- Quality metrics tracking

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- TypeScript 4.5+
- Python 3.8+ (for PDF parsing)

### Dependencies
#### Frontend
- Next.js 15.0.4
- React 18.x
- TypeScript 5.x
- Tailwind CSS
- Radix UI Components

#### Backend
- Express 4.18.2
- TypeScript 5.x
- Node.js 16+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd school-scheduler
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Install Python dependencies:
```bash
cd ../backend/python
pip install -r requirements.txt
```

### Development

1. Start the backend server:
```bash
cd backend
npm run dev
```
The backend will be available at http://localhost:3001

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```
The frontend will be available at http://localhost:3000

### Using the Application

#### Class Management
1. **Import Classes via PDF**:
   - Click the "Import PDF Schedule" area
   - Select your PDF file
   - Classes will be automatically imported

2. **Manual Class Creation**:
   - Fill in the "Add New Class" form
   - Enter class number
   - Select grade level
   - Click "Add Class"

3. **Edit Existing Classes**:
   - Select a class from the dropdown
   - Click the "Edit" button
   - Modify class details
   - Click "Update Class"

4. **Manage Conflicts**:
   - Select a class from the dropdown
   - Use the conflict grid to toggle conflicts
   - Click on time slots to mark/unmark conflicts

### File Structure
```
new-scheduler/
├── backend/          # See backend/README.md for detailed backend documentation
│   ├── data/        # Persistent storage
│   │   ├── backups/ # Automatic backups
│   │   ├── classes.json
│   │   └── constraints.json
│   ├── python/      # PDF parsing
│   │   └── pdf_parser/
│   └── src/
│       ├── api/     # API routes
│       └── services/# Business logic
└── frontend/
    └── app/
        ├── components/ # React components
        └── lib/        # API clients
```

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