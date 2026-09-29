import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import GuestDashboard from '../features/dashboard/GuestDashboard';

const family = {
  id: 'family-1', displayName: 'Gonzalez Family', avatar: 'preset:house',
  children: [
    { id: 'c1', name: 'Juliette', gradeId: 'g1', gradeName: 'Grade 1', groupId: 'g1a', groupName: 'Group A', avatar: 'preset:girl' },
    { id: 'c2', name: 'Mateo', gradeId: 'g3', gradeName: 'Grade 3', groupId: 'g3b', groupName: 'Group B', avatar: 'preset:boy' },
  ],
};
const group = (groupId, groupName, extra = {}) => ({ groupId, groupName, teacherName: 'Miss Mariela', language: 'es', reader: null, ...extra });
const history = [
  { id: 'past', sessionDate: '2020-09-23', startTime: '07:40', status: 'completed', gradeId: 'g1', gradeName: 'Grade 1', groups: [group('g1a', 'Group A', { reader: 'Maria' })], relatedChildren: [{ id: 'c1', name: 'Juliette' }] },
  { id: 'other-group', sessionDate: '2099-10-05', startTime: '07:40', status: 'scheduled', gradeId: 'g1', gradeName: 'Grade 1', groups: [group('g1b', 'Group B')], relatedChildren: [] },
  { id: 'juliette', sessionDate: '2099-10-06', startTime: '07:40', status: 'confirmed', gradeId: 'g1', gradeName: 'Grade 1', groups: [group('g1a', 'Group A')], relatedChildren: [{ id: 'c1', name: 'Juliette' }] },
  { id: 'mateo-cancelled', sessionDate: '2099-10-13', startTime: '07:40', status: 'cancelled', gradeId: 'g3', gradeName: 'Grade 3', groups: [group('g3b', 'Group B')], relatedChildren: [{ id: 'c2', name: 'Mateo' }] },
];
const mockApi = (familyData = family, sessions = history) => {
  global.fetch = jest.fn(url => {
    const data = url === '/v1/families/me' ? { data: familyData } : url === '/v1/history/sessions' ? { data: { sessions } } : [];
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  });
};

test('shows a family-focused dashboard built from the account data', async () => {
  mockApi();
  const onOpenHistory = jest.fn();
  render(<GuestDashboard user={{ id: 'u1', name: 'david lara' }} onOpenHistory={onOpenHistory} onRegisterFamily={() => {}} />);

  expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), David/ })).toBeInTheDocument();
  expect(screen.getByText("Here's what's happening with your family.")).toBeInTheDocument();
  expect(screen.getByText('Gonzalez Family · 2 children · 2 grades')).toBeInTheDocument();

  const summary = screen.getByRole('region', { name: 'Family summary' });
  expect(summary).toHaveTextContent('Upcoming sessions2');
  expect(summary).toHaveTextContent('My children2');
  expect(summary).toHaveTextContent('Grade 1 · Grade 3');

  const next = screen.getByRole('region', { name: 'Next reading session' });
  expect(next).toHaveTextContent("Juliette's grade · other group");
  expect(next).not.toHaveTextContent('For Juliette');
  expect(next).toHaveTextContent('Miss Mariela');

  const children = screen.getByRole('region', { name: 'My children' });
  expect(within(children).getByText('Juliette')).toBeInTheDocument();
  expect(within(children).getByText('No sessions scheduled for their group yet')).toBeInTheDocument();
  fireEvent.click(within(children).getAllByRole('button', { name: 'View sessions →' })[0]);
  expect(onOpenHistory).toHaveBeenCalledWith('child:c1');

  expect(screen.getByRole('region', { name: 'Action required' })).toHaveTextContent('A session for Mateo');
  expect(screen.getByRole('region', { name: 'Recent activity' })).toHaveTextContent('Maria volunteered');
  expect(screen.queryByText(/Operations|Registered sessions|Work queue|Assign volunteer|Manage session/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
});

test('asks to complete the family profile and switches the calendar to agenda', async () => {
  mockApi(null, []);
  render(<GuestDashboard user={{ id: 'u1', name: 'Ana' }} onOpenHistory={() => {}} onRegisterFamily={() => {}} />);

  expect(await screen.findByText('Complete your family profile')).toBeInTheDocument();
  expect(screen.getByText('No children registered yet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
  expect(screen.getByText('No sessions this month.')).toBeInTheDocument();
});

test('shows all caught up when nothing needs action', async () => {
  mockApi(family, history.filter(session => session.status !== 'cancelled'));
  render(<GuestDashboard user={{ id: 'u1', name: 'Ana' }} onOpenHistory={() => {}} onRegisterFamily={() => {}} />);
  expect(await screen.findByText(/You're all caught up/)).toBeInTheDocument();
});
