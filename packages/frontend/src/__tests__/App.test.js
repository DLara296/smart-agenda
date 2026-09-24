import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

test('renders the Smart Agenda application shell', () => {
  render(<App />);
  expect(screen.getByText('SmartAgenda')).toBeInTheDocument();
  expect(screen.getByText('Good morning, David')).toBeInTheDocument();
  expect(screen.getByText('Group A')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register family/i })).toBeInTheDocument();
});

test('search and notification controls expose real interactions', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByLabelText('Search SmartAgenda')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Open notifications'));
  expect(screen.getByText(/teacher confirmation is pending/i)).toBeInTheDocument();
});
