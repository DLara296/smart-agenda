import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../features/dashboard/Dashboard';

test('renders missing volunteer warnings on the dashboard', () => {
  render(<Dashboard sessions={[{ id: 'session-1', missingGroups: ['Group A'] }]} />);
  expect(screen.getByText(/missing volunteer/i)).toBeInTheDocument();
  expect(screen.getByText('Group A')).toBeInTheDocument();
});
