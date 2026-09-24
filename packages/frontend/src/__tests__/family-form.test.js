import React from 'react';
import { render, screen } from '@testing-library/react';
import FamilyForm from '../features/family/FamilyForm';

test('renders household registration fields', () => {
  render(<FamilyForm />);
  expect(screen.getByLabelText(/family name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/school id/i)).toBeInTheDocument();
  expect(screen.getAllByLabelText(/full name/i)).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
});
