import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog Component', () => {
  const mockHandlers = {
    onConfirm: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={false}
      />
    );
    
    expect(container.querySelector('.confirm-dialog-overlay')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Todo?"
        message="Are you sure you want to delete?"
        {...mockHandlers}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Delete Todo?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete?')).toBeInTheDocument();
  });

  it('should render confirm and cancel buttons', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={false}
      />
    );
    
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={false}
      />
    );
    
    const confirmButton = screen.getByRole('button', { name: /Confirm/ });
    fireEvent.click(confirmButton);
    
    expect(mockHandlers.onConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={false}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);
    
    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });

  it('should disable buttons when loading', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={true}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    const confirmButton = screen.getByRole('button', { name: /Processing/ });
    
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('should apply danger style when isDangerous is true', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        {...mockHandlers}
        isLoading={false}
        isDangerous={true}
      />
    );
    
    const confirmButton = screen.getByRole('button', { name: /Confirm/ });
    expect(confirmButton).toHaveClass('btn-danger');
  });
});
