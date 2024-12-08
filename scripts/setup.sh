#!/bin/bash

# Setup script for Simple Scheduler

# Install dependencies
echo "Installing backend dependencies..."
cd backend && npm install
cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install
cd ..

echo "Installing shared dependencies..."
cd shared && npm install
cd ..

# Setup development environment
echo "Setting up development environment..."

# Create necessary directories if they don't exist
mkdir -p logs
mkdir -p data

# Copy example configs if they don't exist
if [ ! -f config/dev.env ]; then
    cp config/dev.env.example config/dev.env
fi

echo "Setup complete! Run 'npm run dev' to start the development servers." 