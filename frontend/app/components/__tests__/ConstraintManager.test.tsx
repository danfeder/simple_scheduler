import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { ConstraintManager } from '../ConstraintManager';
import { constraintsApi } from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api', () => ({
  constraintsApi: {
    get: jest.fn(),
    update: jest.fn(),
    validate: jest.fn(),
  },
}));

describe('ConstraintManager', () => {
  const mockConstraints = {
    maxPeriodsPerDay: 4,
    maxPeriodsPerWeek: 15,
    maxConsecutivePeriods: 2,
    avoidConsecutivePeriods: true,
    blackoutPeriods: [
      { date: '2024-01-01', period: 1 },
      { date: '2024-01-01', period: 2 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (constraintsApi.get as jest.Mock).mockResolvedValue(mockConstraints);
    (constraintsApi.validate as jest.Mock).mockResolvedValue({ valid: true, errors: [] });
    (constraintsApi.update as jest.Mock).mockResolvedValue(mockConstraints);
  });

  it('renders correctly', async () => {
    render(<ConstraintManager />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Check for main components
    expect(screen.getByText(/Constraint Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Periods Per Week/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Periods Per Day/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Consecutive Periods/i)).toBeInTheDocument();
    expect(screen.getByText(/Avoid Consecutive Periods/i)).toBeInTheDocument();
  });

  it('loads constraints on mount', async () => {
    render(<ConstraintManager />);
    
    await waitFor(() => {
      expect(constraintsApi.get).toHaveBeenCalled();
    });

    // Check that values are populated
    expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // maxPeriodsPerWeek
    expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // maxPeriodsPerDay
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // maxConsecutivePeriods
  });

  it('handles input changes', async () => {
    render(<ConstraintManager />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Change maxPeriodsPerWeek
    const weekInput = screen.getByLabelText(/Max Periods Per Week/i);
    fireEvent.change(weekInput, { target: { value: '20' } });
    expect(weekInput).toHaveValue(20);

    // Change maxPeriodsPerDay
    const dayInput = screen.getByLabelText(/Max Periods Per Day/i);
    fireEvent.change(dayInput, { target: { value: '6' } });
    expect(dayInput).toHaveValue(6);
  });

  it('handles save button click', async () => {
    render(<ConstraintManager />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Change a value
    const weekInput = screen.getByLabelText(/Max Periods Per Week/i);
    fireEvent.change(weekInput, { target: { value: '20' } });

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(constraintsApi.validate).toHaveBeenCalled();
      expect(constraintsApi.update).toHaveBeenCalled();
    });
  });

  it('handles validation errors', async () => {
    (constraintsApi.validate as jest.Mock).mockResolvedValue({
      valid: false,
      errors: ['Invalid configuration']
    });

    render(<ConstraintManager />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(constraintsApi.validate).toHaveBeenCalled();
      expect(constraintsApi.update).not.toHaveBeenCalled();
    });
  });

  it('handles blackout period changes', async () => {
    render(<ConstraintManager />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Find and click a period cell
    const periodCells = screen.getAllByRole('button').filter(
      cell => !cell.className.includes('gap-1')
    );
    fireEvent.click(periodCells[0]);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(constraintsApi.update).toHaveBeenCalled();
    });
  });
}); 