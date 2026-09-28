import React from 'react';
import { render, screen } from '@testing-library/react';
import FamilyDirectory from '../features/family/FamilyDirectory';
import MyFamily from '../features/family/MyFamily';

test('renders the useful empty family state', () => {
  render(<FamilyDirectory families={[]} onRegister={() => {}} />);
  expect(screen.getByText(/no families registered/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /register first family/i })).toBeInTheDocument();
});

test('shows the account family without a second registration option', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'family-1', displayName: 'Lara Family', guardians: [{ id: 'g1', name: 'David', relationship: 'Father' }], children: [{ id: 'c1', name: 'Juliette', gradeName: 'Grade 1', groupName: 'Group A' }] } }) }));
  render(<MyFamily onRegister={() => {}} />);
  expect(await screen.findByText('Lara Family')).toBeInTheDocument();
  expect(screen.getByText('Child · Grade 1 · Group A')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
});

test('offers to register a family when the account has none', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) }));
  render(<MyFamily onRegister={() => {}} />);
  expect(await screen.findByRole('button', { name: 'Register my family' })).toBeInTheDocument();
});
