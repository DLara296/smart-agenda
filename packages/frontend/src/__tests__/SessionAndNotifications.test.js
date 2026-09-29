import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationSettings from '../features/notification/NotificationSettings';
import SessionForm from '../features/session/SessionForm';

const jsonResponse = data => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

test('toggles WhatsApp and email notification switches', async () => {
  let saved = { whatsapp: false, email: false, reminderMessage: 'Default message', customMessage: false };
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'PUT') saved = { ...saved, ...JSON.parse(options.body) };
    return jsonResponse({ data: saved });
  });
  render(<NotificationSettings />);
  const whatsapp = screen.getByRole('switch', { name: 'WhatsApp notifications' });
  const email = screen.getByRole('switch', { name: 'Email notifications' });
  await waitFor(() => expect(whatsapp).toBeEnabled());
  fireEvent.click(whatsapp);
  await waitFor(() => expect(whatsapp).toHaveAttribute('aria-checked', 'true'));
  expect(email).toHaveAttribute('aria-checked', 'false');
});

test('edits the reminder message', async () => {
  let saved = { whatsapp: false, email: false, reminderMessage: 'Default message', customMessage: false };
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'PUT') saved = { ...saved, reminderMessage: JSON.parse(options.body).reminderMessage, customMessage: true };
    return jsonResponse({ data: saved });
  });
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Default message');
  fireEvent.change(textarea, { target: { value: 'Bring your favorite book!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save message' }));
  expect(await screen.findByText('Reminder message saved.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith('/v1/notification-preferences', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ reminderMessage: 'Bring your favorite book!' }) }));
  expect(screen.getByRole('button', { name: 'Restore default' })).toBeInTheDocument();
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
