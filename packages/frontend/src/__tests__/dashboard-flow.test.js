import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../features/dashboard/Dashboard';

test('renders missing volunteer warnings on the dashboard', () => {
  render(<Dashboard sessions={[{ id: 'session-1', missingGroups: ['Group A'] }]} />);
  expect(screen.getAllByText(/missing volunteer/i).length).toBeGreaterThan(0);
  expect(screen.getByText('Group A')).toBeInTheDocument();
});
