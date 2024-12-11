import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { ConstraintManager } from '../../components/ConstraintManager';
import { StorageService } from '../../services/StorageService';
import { constraintsApi } from '../../lib/api';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { ScheduleConstraints } from '../../../../shared/types';

// Mock the API and services
jest.mock('../../lib/api');
jest.mock('../../services/StorageService');

describe('Constraint Flow Integration', () => {
  const mockDate = new Date('2023-12-19'); // Tuesday
  
  const mockConstraints: ScheduleConstraints = {
    maxPeriodsPerDay: 4,
    maxPeriodsPerWeek: 15,
    maxConsecutivePeriods: 2,
    avoidConsecutivePeriods: true,
    blackoutPeriods: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    
    // Mock StorageService
    (StorageService.getInstance as jest.Mock).mockReturnValue({
      getConstraints: jest.fn().mockResolvedValue(null),
      saveConstraints: jest.fn().mockImplementation(async (constraints) => constraints)
    });

    // Mock API
    (constraintsApi.update as jest.Mock).mockImplementation(async (constraints) => constraints);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('End-to-End Flow Tests', () => {
    it('should handle blackout period creation and storage', async () => {
      render(<ConstraintManager />);
      
      // Find and click a period cell to block it
      const periodCell = screen.getAllByRole('button')
        .find(cell => cell.title === 'Tuesday, Period 3');
      
      await act(async () => {
        fireEvent.mouseDown(periodCell!);
        fireEvent.mouseUp(periodCell!);
      });

      // Verify StorageService was called with updated constraints
      await waitFor(() => {
        expect(StorageService.getInstance().saveConstraints).toHaveBeenCalledWith(
          expect.objectContaining({
            blackoutPeriods: expect.arrayContaining([
              expect.objectContaining({
                date: mockDate.toISOString().split('T')[0],
                period: 3
              })
            ])
          })
        );
      });

      // Verify API was called with the same data
      expect(constraintsApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          blackoutPeriods: expect.arrayContaining([
            expect.objectContaining({
              date: mockDate.toISOString().split('T')[0],
              period: 3
            })
          ])
        })
      );
    });

    it('should handle complex blackout patterns', async () => {
      render(<ConstraintManager />);
      
      // Block an entire day
      const dayToggle = screen.getByTitle('Block all periods on Tuesday');
      await act(async () => {
        fireEvent.click(dayToggle);
      });

      // Verify all periods for Tuesday were blocked
      await waitFor(() => {
        const savedConstraints = (StorageService.getInstance().saveConstraints as jest.Mock).mock.calls[0][0];
        const tuesdayBlackouts = savedConstraints.blackoutPeriods.filter(
          (bp: any) => bp.date === mockDate.toISOString().split('T')[0]
        );
        expect(tuesdayBlackouts).toHaveLength(8); // All 8 periods should be blocked
      });

      // Block a period across all days
      const periodRowToggle = screen.getByTitle('Block Period 1 across all days');
      await act(async () => {
        fireEvent.click(periodRowToggle);
      });

      // Verify period 1 was blocked across all weekdays
      await waitFor(() => {
        const savedConstraints = (StorageService.getInstance().saveConstraints as jest.Mock).mock.calls[1][0];
        const period1Blackouts = savedConstraints.blackoutPeriods.filter(
          (bp: any) => bp.period === 1
        );
        expect(period1Blackouts).toHaveLength(5); // One for each weekday
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      (constraintsApi.update as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      render(<ConstraintManager />);
      
      const periodCell = screen.getAllByRole('button')
        .find(cell => cell.title === 'Tuesday, Period 3');
      
      await act(async () => {
        fireEvent.mouseDown(periodCell!);
        fireEvent.mouseUp(periodCell!);
      });

      // Verify error toast is shown
      await waitFor(() => {
        expect(screen.getByText(/Failed to update constraints/i)).toBeInTheDocument();
      });

      // Verify StorageService still attempted to save
      expect(StorageService.getInstance().saveConstraints).toHaveBeenCalled();
    });

    it('should handle concurrent modifications', async () => {
      let savedConstraints: any = null;
      
      // Mock StorageService to simulate concurrent modifications
      (StorageService.getInstance as jest.Mock).mockReturnValue({
        getConstraints: jest.fn().mockImplementation(async () => savedConstraints),
        saveConstraints: jest.fn().mockImplementation(async (constraints) => {
          savedConstraints = constraints;
          return constraints;
        })
      });

      render(<ConstraintManager />);
      
      // Make two quick modifications
      const periodCells = screen.getAllByRole('button')
        .filter(cell => cell.title?.match(/Tuesday, Period [34]/));
      
      await act(async () => {
        fireEvent.mouseDown(periodCells[0]);
        fireEvent.mouseUp(periodCells[0]);
      });

      await act(async () => {
        fireEvent.mouseDown(periodCells[1]);
        fireEvent.mouseUp(periodCells[1]);
      });

      // Verify both modifications were saved correctly
      await waitFor(() => {
        const finalConstraints = savedConstraints;
        expect(finalConstraints.blackoutPeriods).toHaveLength(2);
        expect(finalConstraints.blackoutPeriods).toContainEqual(
          expect.objectContaining({
            date: mockDate.toISOString().split('T')[0],
            period: 3
          })
        );
        expect(finalConstraints.blackoutPeriods).toContainEqual(
          expect.objectContaining({
            date: mockDate.toISOString().split('T')[0],
            period: 4
          })
        );
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset of blackout periods
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2023, 11, Math.floor(i / 8) + 1).toISOString().split('T')[0],
        period: (i % 8) + 1
      }));

      (StorageService.getInstance as jest.Mock).mockReturnValue({
        getConstraints: jest.fn().mockResolvedValue({ 
          ...mockConstraints, 
          blackoutPeriods: largeDataset 
        }),
        saveConstraints: jest.fn().mockImplementation(async (constraints) => constraints)
      });

      const startTime = performance.now();
      
      render(<ConstraintManager />);
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second

      // Test interaction performance
      const periodCell = screen.getAllByRole('button')
        .find(cell => cell.title === 'Tuesday, Period 3');
      
      const interactionStartTime = performance.now();
      
      await act(async () => {
        fireEvent.mouseDown(periodCell!);
        fireEvent.mouseUp(periodCell!);
      });

      const interactionTime = performance.now() - interactionStartTime;
      expect(interactionTime).toBeLessThan(100); // Interaction should be processed in less than 100ms
    });
  });
}); 