import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AuthScreen from '../features/auth/AuthScreen';

test('registers with required profile fields and returns the authenticated user', async () => {
  const onAuthenticated = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'user-1', name: 'Mariela Garcia', role: 'guest' } }) }));
  render(<AuthScreen onAuthenticated={onAuthenticated} />);
  fireEvent.click(screen.getByRole('button', { name: /register/i }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Mariela Garcia' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mariela@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('button', { name: 'Create account' })).toBeInTheDocument();
  expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ role: 'guest' }));
});

test('shows a safe provider error for unavailable social authentication', () => {
  render(<AuthScreen onAuthenticated={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
  expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in is not configured yet.');
});
