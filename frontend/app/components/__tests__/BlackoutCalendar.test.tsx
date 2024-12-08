import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BlackoutCalendar } from '../BlackoutCalendar';

interface BlackoutPeriod {
  date: string;
  period: number;
}

// Mock useState
const mockStates = {
  weekStart: new Date('2023-12-18'), // Monday
  isDragging: false,
  dragStart: null as { date: string; period: number } | null,
  dragOperation: null as 'add' | 'remove' | null
};

const mockSetState = {
  isDragging: (value: boolean) => { mockStates.isDragging = value; },
  dragStart: (value: typeof mockStates.dragStart) => { mockStates.dragStart = value; },
  dragOperation: (value: typeof mockStates.dragOperation) => { mockStates.dragOperation = value; }
};

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn((init) => {
    if (typeof init === 'function') {
      return [mockStates.weekStart, (fn: ((date: Date) => Date) | Date) => {
        if (typeof fn === 'function') {
          mockStates.weekStart = fn(mockStates.weekStart);
        } else {
          mockStates.weekStart = fn;
        }
      }];
    }
    if (init === false) {
      return [mockStates.isDragging, mockSetState.isDragging];
    }
    if (init === null && mockStates.dragStart === null) {
      return [mockStates.dragStart, mockSetState.dragStart];
    }
    return [mockStates.dragOperation, mockSetState.dragOperation];
  })
}));

describe('BlackoutCalendar', () => {
  const mockDate = new Date('2023-12-19'); // Tuesday
  const mockBlackoutPeriods: BlackoutPeriod[] = [
    { date: mockDate.toISOString().split('T')[0], period: 1 },
    { date: mockDate.toISOString().split('T')[0], period: 2 }
  ];

  const mockProps = {
    blackoutPeriods: mockBlackoutPeriods,
    onToggleBlackout: jest.fn(),
    onToggleFullDay: jest.fn(),
    onTogglePeriodForWeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    // Reset mock states
    mockStates.weekStart = new Date('2023-12-18');
    mockStates.isDragging = false;
    mockStates.dragStart = null;
    mockStates.dragOperation = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    // Check for day headers
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();

    // Check for period numbers
    for (let i = 1; i <= 8; i++) {
      expect(screen.getAllByText(i.toString())[0]).toBeInTheDocument();
    }
  });

  it('shows blocked periods correctly', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    // Find blocked cells by their text content and date
    const blockedCells = screen.getAllByRole('button')
      .filter(cell => {
        return (
          cell.title === `Tuesday, Period 1` ||
          cell.title === `Tuesday, Period 2`
        );
      });
    expect(blockedCells).toHaveLength(2);
  });

  it('handles individual period clicks', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    const periodCell = screen.getAllByRole('button')
      .find(cell => cell.title === 'Tuesday, Period 3');
    
    if (!periodCell) throw new Error('Period cell not found');
    
    fireEvent.mouseDown(periodCell);
    fireEvent.mouseUp(periodCell);
    
    expect(mockProps.onToggleBlackout).toHaveBeenCalledWith(
      mockDate.toISOString().split('T')[0],
      3
    );
  });

  it('handles full day toggle', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    const dayToggle = screen.getByTitle('Block all periods on Tuesday');
    fireEvent.click(dayToggle);
    
    expect(mockProps.onToggleFullDay).toHaveBeenCalledWith(
      mockDate.toISOString().split('T')[0]
    );
  });

  it('handles period row toggle', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    const rowToggle = screen.getByTitle('Block Period 1 across all days');
    fireEvent.click(rowToggle);
    
    expect(mockProps.onTogglePeriodForWeek).toHaveBeenCalledWith(1, mockStates.weekStart);
  });

  it('supports drag selection', () => {
    const { rerender } = render(<BlackoutCalendar {...mockProps} />);
    
    const cells = screen.getAllByRole('button')
      .filter(cell => cell.title?.match(/Tuesday, Period [3-5]/));
    
    // Simulate drag start
    fireEvent.mouseDown(cells[0]);
    expect(mockProps.onToggleBlackout).toHaveBeenCalledWith(mockDate.toISOString().split('T')[0], 3);
    
    // Simulate drag to next cell
    mockSetState.isDragging(true);
    mockSetState.dragStart({ date: mockDate.toISOString().split('T')[0], period: 3 });
    mockSetState.dragOperation('add');
    
    // Update props to reflect the first cell being blackedout
    const updatedProps = {
      ...mockProps,
      blackoutPeriods: [
        ...mockProps.blackoutPeriods,
        { date: mockDate.toISOString().split('T')[0], period: 3 }
      ]
    };
    
    rerender(<BlackoutCalendar {...updatedProps} />);
    
    // Simulate drag to next cell
    fireEvent.mouseEnter(cells[1]);
    expect(mockProps.onToggleBlackout).toHaveBeenCalledWith(mockDate.toISOString().split('T')[0], 4);
    
    // Update props to reflect both cells being blackedout
    const finalProps = {
      ...updatedProps,
      blackoutPeriods: [
        ...updatedProps.blackoutPeriods,
        { date: mockDate.toISOString().split('T')[0], period: 4 }
      ]
    };
    
    rerender(<BlackoutCalendar {...finalProps} />);
    
    // Simulate drag to last cell
    fireEvent.mouseEnter(cells[2]);
    expect(mockProps.onToggleBlackout).toHaveBeenCalledWith(mockDate.toISOString().split('T')[0], 5);
    
    // End drag
    fireEvent.mouseUp(cells[2]);
    mockSetState.isDragging(false);
    mockSetState.dragStart(null);
    mockSetState.dragOperation(null);
    expect(mockStates.isDragging).toBe(false);
    expect(mockStates.dragStart).toBe(null);
    expect(mockStates.dragOperation).toBe(null);
  });

  it('handles week navigation', () => {
    render(<BlackoutCalendar {...mockProps} />);
    
    const prevButton = screen.getByRole('button', { name: /Previous week/i });
    const nextButton = screen.getByRole('button', { name: /Next week/i });
    
    // Navigate to next week
    fireEvent.click(nextButton);
    
    // Re-render to update state
    const { rerender } = render(<BlackoutCalendar {...mockProps} />);
    
    const nextWeekDate = new Date('2023-12-25');
    expect(mockStates.weekStart.toISOString()).toBe(nextWeekDate.toISOString());
    
    // Navigate back
    fireEvent.click(prevButton);
    
    rerender(<BlackoutCalendar {...mockProps} />);
    
    const prevWeekDate = new Date('2023-12-18');
    expect(mockStates.weekStart.toISOString()).toBe(prevWeekDate.toISOString());
  });
}); 