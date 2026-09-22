import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TodoForm from '../TodoForm';

describe('TodoForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form inputs and button', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Todo/ })).toBeInTheDocument();
  });

  it('should display character count', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    expect(screen.getByText('0/255')).toBeInTheDocument();
  });

  it('should update character count as user types', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Add a new todo...');
    fireEvent.change(input, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/255')).toBeInTheDocument();
  });

  it('should show error when title is empty on submit', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    fireEvent.click(button);
    
    expect(screen.getByText('Todo title cannot be empty')).toBeInTheDocument();
  });

  it('should show error when title exceeds 255 characters', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Add a new todo...');
    const longTitle = 'a'.repeat(256);
    fireEvent.change(input, { target: { value: longTitle } });
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    fireEvent.click(button);
    
    expect(screen.getByText('Todo title cannot exceed 255 characters')).toBeInTheDocument();
  });

  it('should call onSubmit with title when form is submitted', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Add a new todo...');
    fireEvent.change(input, { target: { value: 'New Todo' } });
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    
    await waitFor(() => {
      fireEvent.click(button);
    });
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('New Todo', null);
    });
  });

  it('should call onSubmit with title and due date', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new todo...');
    const dueDateInput = screen.getByLabelText('Due date');
    
    fireEvent.change(titleInput, { target: { value: 'New Todo' } });
    fireEvent.change(dueDateInput, { target: { value: '2025-12-25' } });
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    
    await waitFor(() => {
      fireEvent.click(button);
    });
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('New Todo', '2025-12-25');
    });
  });

  it('should clear inputs after successful submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new todo...');
    fireEvent.change(titleInput, { target: { value: 'New Todo' } });
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    
    await waitFor(() => {
      fireEvent.click(button);
    });
    
    await waitFor(() => {
      expect(screen.getByText('0/255')).toBeInTheDocument();
      expect(titleInput).toHaveValue('');
    });
  });

  it('should disable inputs when loading', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={true} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new todo...');
    const dueDateInput = screen.getByLabelText('Due date');
    const button = screen.getByRole('button', { name: /Adding/ });
    
    expect(titleInput).toBeDisabled();
    expect(dueDateInput).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should trim whitespace from title', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Add a new todo...');
    fireEvent.change(input, { target: { value: '  Test Todo  ' } });
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    
    await waitFor(() => {
      fireEvent.click(button);
    });
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test Todo', null);
    });
  });

  it('should clear error when user starts typing', () => {
    render(<TodoForm onSubmit={mockOnSubmit} isLoading={false} />);
    
    const button = screen.getByRole('button', { name: /Add Todo/ });
    fireEvent.click(button);
    
    expect(screen.getByText('Todo title cannot be empty')).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('Add a new todo...');
    fireEvent.change(input, { target: { value: 'Test' } });
    
    expect(screen.queryByText('Todo title cannot be empty')).not.toBeInTheDocument();
  });
});
