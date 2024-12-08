#!/bin/bash

# Build script for Simple Scheduler

# Build shared types
echo "Building shared types..."
cd shared && npm run build
cd ..

# Build backend
echo "Building backend..."
cd backend && npm run build
cd ..

# Build frontend
echo "Building frontend..."
cd frontend && npm run build
cd ..

echo "Build complete! Check the dist directories in each package for the output." 