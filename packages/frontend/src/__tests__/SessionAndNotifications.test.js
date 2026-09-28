import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationSettings from '../features/notification/NotificationSettings';
import SessionForm from '../features/session/SessionForm';

const jsonResponse = data => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

test('toggles WhatsApp and email notification switches', async () => {
  global.fetch = jest.fn((url, options) => options?.method === 'PUT'
    ? jsonResponse({ data: JSON.parse(options.body) })
    : jsonResponse({ data: { whatsapp: false, email: false } }));
  render(<NotificationSettings />);
  const whatsapp = screen.getByRole('switch', { name: 'WhatsApp notifications' });
  const email = screen.getByRole('switch', { name: 'Email notifications' });
  await waitFor(() => expect(whatsapp).toBeEnabled());
  fireEvent.click(whatsapp);
  await waitFor(() => expect(whatsapp).toHaveAttribute('aria-checked', 'true'));
  expect(email).toHaveAttribute('aria-checked', 'false');
});

test('edits an existing session with its current data', async () => {
  const onSuccess = jest.fn();
  global.fetch = jest.fn(() => jsonResponse({ id: 'session-1' }));
  const session = { id: 'session-1', gradeId: 'Grade 1', sessionDate: '2026-10-06', startTime: '07:40', image: '/assets/session-default.svg' };
  render(<SessionForm session={session} onCancel={() => {}} onSuccess={onSuccess} />);
  expect(screen.getByLabelText('Grade')).toHaveValue('Grade 1');
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'Grade 2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(global.fetch).toHaveBeenCalledWith('/v1/sessions/session-1', expect.objectContaining({ method: 'PATCH' }));
});

test('shows an error when the session cannot be saved', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'You do not have permission to access this resource.' } }) }));
  render(<SessionForm onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'Grade 1' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create session' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
});
