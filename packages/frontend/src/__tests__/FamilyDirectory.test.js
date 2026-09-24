import React from 'react';
import { render, screen } from '@testing-library/react';
import FamilyDirectory from '../features/family/FamilyDirectory';

test('renders the useful empty family state', () => {
  render(<FamilyDirectory families={[]} onRegister={() => {}} />);
  expect(screen.getByText(/no families registered/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register first family/i })).toBeInTheDocument();
});
