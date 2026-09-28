import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FamilyForm from '../features/family/FamilyForm';

test('renders household registration fields', () => {
  render(<FamilyForm />);
  expect(screen.getByLabelText(/family name/i)).toBeInTheDocument();
  expect(screen.getByLabelText('School')).toBeInTheDocument();
  expect(screen.getAllByLabelText(/full name/i)).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
});

test('opens registered schools and offers add new school', () => {
  render(<FamilyForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Select school' }));
  expect(screen.getByRole('option', { name: /Westfield Elementary/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /add new school/i }));
  expect(screen.getByLabelText(/new school name/i)).toBeInTheDocument();
});

test('keeps dependent selectors disabled until their parent is selected', () => {
  render(<FamilyForm />);
  expect(screen.getByRole('button', { name: 'Select grade' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Select group' })).toBeDisabled();
});
