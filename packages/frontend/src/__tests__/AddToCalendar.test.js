import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AddToCalendar from '../features/calendarExport/AddToCalendar';
import SessionDirectory from '../features/session/SessionDirectory';

const session = { id: 's1', sessionDate: '2026-10-06', startTime: '07:40', endTime: '08:40', timezone: 'UTC', gradeName: 'Grade 1', schoolName: 'Westfield', groups: [{ groupId: 'g1', groupName: 'Group A', language: 'es' }] };

test('lets the user pick Google or Outlook as links that open the pre-filled event in a new tab', () => {
  render(<AddToCalendar session={session} />);
  const toggle = screen.getByRole('button', { name: 'Add to Calendar' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText(/Nothing changes in SmartAgenda/)).toBeInTheDocument();

  fireEvent.click(toggle);
  const menu = screen.getByRole('list', { name: 'Choose a calendar' });
  const links = within(menu).getAllByRole('link');
  expect(links.map(link => link.textContent)).toEqual(['Google Calendar (opens in a new tab)', 'Outlook Calendar (opens in a new tab)']);
  expect(links[0]).toHaveAttribute('href', expect.stringContaining('https://calendar.google.com/calendar/render?'));
  expect(links[1]).toHaveAttribute('href', expect.stringContaining('https://outlook.live.com/calendar/0/deeplink/compose?'));
  links.forEach(link => {
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  fireEvent.click(links[0]);
  expect(screen.queryByRole('list', { name: 'Choose a calendar' })).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
});

test('closes the menu with Escape and returns focus to the toggle', () => {
  render(<AddToCalendar session={session} />);
  const toggle = screen.getByRole('button', { name: /Add to Calendar/ });
  fireEvent.click(toggle);
  fireEvent.keyDown(screen.getByRole('list', { name: 'Choose a calendar' }), { key: 'Escape' });
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
});

test('offers Add to Calendar next to Edit in the Reading Sessions list', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ ...session, status: 'scheduled' }]) }));
  render(<SessionDirectory onNew={() => {}} onEdit={() => {}} />);
  expect(await screen.findByText('Grade 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Calendar' }));
  expect(screen.getByRole('link', { name: /Outlook Calendar/ })).toHaveAttribute('href', expect.stringContaining('outlook.live.com'));
});

test('cancels a reading session only after explicit confirmation', async () => {
  const deleteRequest = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { cancelled: true } }) }));
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/v1/sessions' && !options.method) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ ...session, status: 'scheduled' }]) });
    if (options.method === 'DELETE') return deleteRequest(url, options);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  render(<SessionDirectory onNew={() => {}} onEdit={() => {}} canManage />);
  fireEvent.click(await screen.findByRole('button', { name: /delete reading session/i }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Assignments and history are preserved');
  expect(deleteRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, delete session' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Reading session cancelled.');
  expect(deleteRequest).toHaveBeenCalledWith(`/v1/sessions/${session.id}`, expect.objectContaining({ method: 'DELETE' }));
});

test('is disabled with an explanation when the session has no start time', () => {
  render(<AddToCalendar session={{ ...session, startTime: null }} />);
  const button = screen.getByRole('button', { name: 'Add to Calendar' });
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription('This session cannot be added to a calendar because its date or start time is missing.');
});
