import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CalendarView from '../features/calendar/CalendarView';

const children = [
  { id: 'c1', name: 'Juliette', gradeId: 'g1', gradeName: 'Grade 1', groupId: 'g1a', groupName: 'Group A' },
  { id: 'c2', name: 'Mateo', gradeId: 'g3', gradeName: 'Grade 3', groupId: 'g3b', groupName: 'Group B' },
];
const group = (groupId, groupName, language = 'es') => ({ groupId, groupName, teacherName: 'Miss Mariela', language, reader: null });
const session = (id, sessionDate, gradeId, gradeName, groups, status = 'scheduled', relatedChildren = []) => ({ id, sessionDate, startTime: '07:40', endTime: '08:40', status, schoolName: 'Westfield', gradeId, gradeName, groups, relatedChildren });
const sessions = [
  session('s1', '2099-10-06', 'g1', 'Grade 1', [group('g1a', 'Group A')], 'confirmed', [{ id: 'c1', name: 'Juliette' }]),
  session('s2', '2099-10-06', 'g1', 'Grade 1', [group('g1b', 'Group B')]),
  session('s3', '2099-10-06', 'g3', 'Grade 3', [group('g3a', 'Group A', 'en')]),
  session('s4', '2099-10-13', 'g3', 'Grade 3', [group('g3b', 'Group B', 'en')], 'cancelled', [{ id: 'c2', name: 'Mateo' }]),
];
const respond = data => Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });

beforeEach(() => { global.fetch = jest.fn(() => respond({ children, grades: [], groups: [], sessions: [...sessions, sessions[0]] })); });

test('shows authorized grade sessions once each in a read-only month view', async () => {
  render(<CalendarView />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading reading sessions');
  const october6 = await screen.findByRole('group', { name: /October 6, 3 sessions/ });

  expect(global.fetch).toHaveBeenCalledWith('/v1/history/sessions', expect.objectContaining({ credentials: 'include' }));
  expect(screen.getByRole('heading', { name: /October 2099/i })).toBeInTheDocument();
  expect(within(october6).getAllByRole('button', { name: /reading session, Tuesday, October 6 at 7:40 AM/ })).toHaveLength(2);
  fireEvent.click(within(october6).getByRole('button', { name: 'Show all 3 sessions on Tuesday, October 6' }));
  const dayList = screen.getByRole('region', { name: 'Sessions on Tuesday, October 6' });
  expect(within(dayList).getAllByRole('button')).toHaveLength(3);
  expect(screen.getByRole('button', { name: /Grade 3, Group B, English reading session, Tuesday, October 13 at 7:40 AM, Cancelled/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /create|new|edit|delete|reschedule/i })).not.toBeInTheDocument();
  screen.getAllByRole('button').forEach(button => expect(button).not.toHaveAttribute('draggable', 'true'));
});

test('opens accessible read-only details without implying grade-only participation', async () => {
  render(<CalendarView />);
  const october6 = await screen.findByRole('group', { name: /October 6, 3 sessions/ });
  const trigger = within(october6).getByRole('button', { name: /Grade 1, Group B/ });
  fireEvent.click(trigger);

  const dialog = screen.getByRole('dialog', { name: 'Grade 1 · Group B' });
  expect(dialog).toHaveTextContent("Juliette's grade · other group");
  expect(dialog).not.toHaveTextContent('For Juliette');
  expect(dialog).toHaveTextContent('Miss Mariela');
  expect(dialog).toHaveTextContent('Spanish');
  expect(within(dialog).getByRole('button', { name: 'Close session details' })).toHaveFocus();
  expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('navigates periods and switches between week and agenda views', async () => {
  render(<CalendarView />);
  await screen.findByRole('group', { name: /October 6, 3 sessions/ });

  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(screen.getByRole('heading', { name: /Oct 5 – Oct 11, 2099/ })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /Tuesday, October 6, 3 sessions/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByRole('group', { name: /Tuesday, October 13, 1 session$/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
  expect(screen.getByRole('button', { name: /Grade 1, Group A, Spanish reading session, Tuesday, October 6/ })).toHaveTextContent('Grade 1 Reading Session');
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('No reading sessions scheduled for this period.')).toBeInTheDocument();
});

test('shows empty and error states with retry', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'SQLITE_ERROR' } }) }))
    .mockImplementationOnce(() => respond({ children: [], grades: [], groups: [], sessions: [] }));
  render(<CalendarView />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("We couldn't load the reading sessions. Please try again.");
  expect(alert).not.toHaveTextContent('SQLITE');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No grade information is available for your family yet.')).toBeInTheDocument();
});

test('explains when the family grades have no sessions', async () => {
  global.fetch = jest.fn(() => respond({ children, grades: [], groups: [], sessions: [] }));
  render(<CalendarView />);
  expect(await screen.findByText("No reading sessions are currently available for your children's grades.")).toBeInTheDocument();
});
