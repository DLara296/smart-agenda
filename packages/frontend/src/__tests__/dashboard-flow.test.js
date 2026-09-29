import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../features/dashboard/Dashboard';

test('renders missing volunteer warnings on the dashboard', () => {
  render(<Dashboard sessions={[{ id: 'session-1', missingGroups: ['Group A'] }]} />);
  expect(screen.getAllByText(/missing volunteer/i).length).toBeGreaterThan(0);
  expect(screen.getByText('Group A')).toBeInTheDocument();
});

test('places Registered sessions in a full-width dashboard grid row', () => {
  render(<Dashboard sessions={[]} registeredSessions={[{ id: 'registered-1', sessionDate: '2026-10-06', startTime: '09:00', status: 'scheduled' }]} />);
  const panel = screen.getByRole('region', { name: 'Registered reading sessions' });
  expect(panel).toHaveClass('registered-sessions-panel');
});
