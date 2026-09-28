import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ActionForm from '../features/workflow/ActionForm';

test('confirms a volunteer assignment action', () => {
  render(<ActionForm type="volunteer" onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Volunteer'), { target: { value: 'Maria Gonzalez' } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign volunteer' }));
  expect(screen.getByText('Volunteer assignment saved.')).toBeInTheDocument();
});

test('confirms a notification action', () => {
  render(<ActionForm type="notification" onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please confirm.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send notification' }));
  expect(screen.getByText('Notification queued successfully.')).toBeInTheDocument();
});