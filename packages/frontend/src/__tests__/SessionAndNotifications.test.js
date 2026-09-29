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

const messageServer = ({ saved: initial = {}, failPut = false, putResponse } = {}) => {
  let saved = { whatsapp: false, email: false, reminderMessage: 'Default message', customMessage: false, ...initial };
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'PUT') {
      if (putResponse) return putResponse();
      if (failPut) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: { message: 'SQLITE_BUSY: database is locked' } }) });
      const { reminderMessage } = JSON.parse(options.body);
      saved = { ...saved, reminderMessage: reminderMessage ?? 'Default message', customMessage: reminderMessage !== null };
    }
    return jsonResponse({ data: saved });
  });
};
const saveButton = () => screen.queryByRole('button', { name: /Save message|Saving/ });
const editButton = () => screen.queryByRole('button', { name: 'Edit message' });

test('starts in edit mode without a saved message and switches to view mode after saving', async () => {
  messageServer();
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Default message');
  expect(saveButton()).toBeInTheDocument();
  expect(editButton()).not.toBeInTheDocument();
  expect(textarea).not.toHaveAttribute('readonly');

  fireEvent.change(textarea, { target: { value: 'Bring your favorite book!' } });
  fireEvent.click(saveButton());
  expect(await screen.findByText('Reminder message saved.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith('/v1/notification-preferences', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ reminderMessage: 'Bring your favorite book!' }) }));
  expect(textarea).toHaveAttribute('readonly');
  expect(textarea).toHaveValue('Bring your favorite book!');
  expect(saveButton()).not.toBeInTheDocument();
  expect(editButton()).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Restore default' })).toBeInTheDocument();
});

test('opens a saved message in view mode and edits it without losing the text', async () => {
  messageServer({ saved: { reminderMessage: 'Saved earlier', customMessage: true } });
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Saved earlier');
  expect(textarea).toHaveAttribute('readonly');
  expect(editButton()).toBeInTheDocument();
  expect(saveButton()).not.toBeInTheDocument();

  fireEvent.click(editButton());
  expect(textarea).not.toHaveAttribute('readonly');
  expect(textarea).toHaveValue('Saved earlier');
  expect(saveButton()).toBeInTheDocument();
  expect(editButton()).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('stays in edit mode and keeps the text when saving fails', async () => {
  messageServer({ failPut: true });
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Default message');
  fireEvent.change(textarea, { target: { value: 'My new message' } });
  fireEvent.click(saveButton());
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("We couldn't save the notification message. Please try again.");
  expect(alert).not.toHaveTextContent('SQLITE');
  expect(textarea).toHaveValue('My new message');
  expect(textarea).not.toHaveAttribute('readonly');
  expect(saveButton()).toBeEnabled();
  expect(editButton()).not.toBeInTheDocument();
});

test('prevents duplicate saves while a save is in progress', async () => {
  let finish;
  messageServer({ putResponse: () => new Promise(resolve => { finish = () => resolve({ ok: true, json: () => Promise.resolve({ data: { whatsapp: false, email: false, reminderMessage: 'Once', customMessage: true } }) }); }) });
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Default message');
  fireEvent.change(textarea, { target: { value: 'Once' } });
  const button = saveButton();
  fireEvent.click(button);
  fireEvent.submit(screen.getByRole('form', { name: 'Reminder message settings' }));
  expect(button).toHaveTextContent('Saving...');
  expect(button).toBeDisabled();
  expect(editButton()).not.toBeInTheDocument();
  finish();
  expect(await screen.findByRole('button', { name: 'Edit message' })).toBeInTheDocument();
  expect(global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
});

test('validates an empty message without calling the server', async () => {
  messageServer();
  render(<NotificationSettings />);
  const textarea = await screen.findByDisplayValue('Default message');
  fireEvent.change(textarea, { target: { value: '   ' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Reminder message settings' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a reminder message.');
  expect(global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0);
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
