import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('core dashboard controls have accessible names and status text', async () => {
  render(<App />);
  await screen.findByTestId('app-shell');
  expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  expect(screen.getByText(/volunteer needed/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register family/i })).toBeInTheDocument();
});
