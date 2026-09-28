import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HistoryView from '../features/history/HistoryView';

const children = [
  { id: 'child-1', name: 'Juliette', gradeId: 'grade-1', gradeName: 'Grade 1', groupId: 'group-1a', groupName: 'Group A' },
  { id: 'child-2', name: 'Mateo', gradeId: 'grade-3', gradeName: 'Grade 3', groupId: 'group-3b', groupName: 'Group B' },
];
const grades = [{ id: 'grade-1', name: 'Grade 1' }, { id: 'grade-3', name: 'Grade 3' }];
const groups = [
  { id: 'group-1a', name: 'Group A', gradeId: 'grade-1', gradeName: 'Grade 1' },
  { id: 'group-3b', name: 'Group B', gradeId: 'grade-3', gradeName: 'Grade 3' },
];
const session = (id, sessionDate, status, relatedChildren = []) => ({
  id, sessionDate, startTime: '07:40', endTime: '08:40', status, schoolName: 'Westfield', gradeId: 'grade-1', gradeName: 'Grade 1',
  groups: [{ groupId: 'group-1a', groupName: 'Group A', teacherName: 'Miss Mariela', language: 'es', reader: null }], relatedChildren,
});
const allSessions = [
  session('s-past', '2020-09-01', 'completed'),
  session('s-future', '2099-10-06', 'scheduled', [{ id: 'child-1', name: 'Juliette' }]),
  session('s-cancelled', '2099-10-13', 'cancelled'),
];
const ok = data => Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });

test('defaults to all grade sessions, shows statuses, and renders no modification controls', async () => {
  global.fetch = jest.fn(() => ok({ children, grades, sessions: allSessions }));
  render(<HistoryView />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading reading sessions');
  expect(await screen.findByText('Upcoming sessions')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/v1/history/sessions?view=all', expect.anything());
  expect(screen.getByLabelText('View')).toHaveValue('all');
  expect(screen.getByText('Past sessions')).toBeInTheDocument();
  expect(screen.getByText('Cancelled sessions')).toBeInTheDocument();
  expect(screen.getByText('Completed', { selector: '.status-badge' })).toBeInTheDocument();
  expect(screen.getByText('Cancelled', { selector: '.status-badge' })).toBeInTheDocument();
  expect(screen.getByText('Child: Juliette')).toBeInTheDocument();
  expect(screen.getAllByText('Child:', { exact: false })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /create|new|edit|delete|cancel session|save/i })).not.toBeInTheDocument();
  expect(within(screen.getByLabelText('View')).getByRole('option', { name: 'Juliette — Grade 1 · Group A' })).toBeInTheDocument();
  expect(within(screen.getByLabelText('View')).getByRole('option', { name: 'Mateo — Grade 3 · Group B' })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[0]);
  expect(screen.getByText(/Teacher: Miss Mariela/)).toBeInTheDocument();
});

test('requests the selected filters and shows the empty state', async () => {
  global.fetch = jest.fn(url => ok({ children, grades, sessions: url.includes('childId') ? [] : allSessions }));
  render(<HistoryView />);
  await screen.findByText('Upcoming sessions');

  fireEvent.change(screen.getByLabelText('View'), { target: { value: 'child:child-2' } });
  expect(await screen.findByText('No reading sessions found for this selection.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith('/v1/history/sessions?view=child&childId=child-2', expect.anything());

  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelled' } });
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/v1/history/sessions?view=child&childId=child-2&status=cancelled', expect.anything()));
});

test('filters by group and narrows groups to the selected grade', async () => {
  global.fetch = jest.fn(() => ok({ children, grades, groups, sessions: allSessions }));
  render(<HistoryView />);
  await screen.findByText('Upcoming sessions');

  const groupSelect = screen.getByLabelText('Group');
  expect(within(groupSelect).getByRole('option', { name: 'Grade 1 · Group A' })).toBeInTheDocument();
  expect(within(groupSelect).getByRole('option', { name: 'Grade 3 · Group B' })).toBeInTheDocument();

  fireEvent.change(groupSelect, { target: { value: 'group-3b' } });
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/v1/history/sessions?view=all&groupId=group-3b', expect.anything()));

  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'grade-1' } });
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/v1/history/sessions?view=all&gradeId=grade-1', expect.anything()));
  expect(screen.getByLabelText('Group')).toHaveValue('');
  expect(within(screen.getByLabelText('Group')).queryByRole('option', { name: /Group B/ })).not.toBeInTheDocument();
});

test('shows a safe error with retry and a no-children state', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'SQLITE_ERROR: raw detail' } }) }))
    .mockImplementationOnce(() => ok({ children: [], grades: [], sessions: [] }));
  render(<HistoryView />);

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("We couldn't load the reading sessions. Please try again.");
  expect(alert).not.toHaveTextContent('SQLITE');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No registered children yet')).toBeInTheDocument();
});
