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

const familyApi = ({ children = [{ id: 'c1', name: 'Juliette', gradeId: 'g1', gradeName: 'Grade 1', groupId: 'g1a' }, { id: 'c2', name: 'Mateo', gradeId: 'g1', gradeName: 'Grade 1', groupId: 'g1b' }], save } = {}) => {
  global.fetch = jest.fn((url, options = {}) => {
    if (options.method) return save ? save(url, options) : jsonResponse({ id: 'session-1' });
    if (url === '/v1/families/me') return jsonResponse({ data: children.length ? { id: 'f1', schoolId: 'school-a', children } : null });
    if (url === '/v1/grades/g1/groups') return jsonResponse({ data: [{ id: 'g1a', name: 'Group A' }, { id: 'g1b', name: 'Group B' }] });
    return jsonResponse({ data: [] });
  });
};

test('lets a family schedule a session only for their children grades and real groups', async () => {
  const onSuccess = jest.fn();
  familyApi();
  render(<SessionForm familyOnly onCancel={() => {}} onSuccess={onSuccess} />);
  const grade = screen.getByLabelText('Grade');
  await screen.findByRole('option', { name: 'Grade 1' });
  expect(screen.queryByLabelText('School')).not.toBeInTheDocument();
  expect(screen.getAllByRole('option', { name: 'Grade 1' })).toHaveLength(1);
  fireEvent.change(grade, { target: { value: 'g1' } });
  await screen.findByRole('option', { name: 'Group B' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1b' } });
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'en' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create session' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const [url, options] = global.fetch.mock.calls.find(([, requestOptions]) => requestOptions?.method === 'POST');
  expect(url).toBe('/v1/sessions');
  expect(JSON.parse(options.body)).toEqual(expect.objectContaining({ gradeId: 'g1', assignments: [{ groupId: 'g1b', language: 'en' }] }));
  expect(JSON.parse(options.body)).not.toHaveProperty('schoolId');
});

test('asks families without registered children to add them first', async () => {
  familyApi({ children: [] });
  render(<SessionForm familyOnly onCancel={() => {}} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Register your children in My Family before scheduling a session for their grade.');
  expect(screen.getByLabelText('Grade')).toBeDisabled();
});

test('edits an existing session with its current grade and group', async () => {
  const onSuccess = jest.fn();
  familyApi();
  const session = { id: 'session-1', schoolId: 'school-a', gradeId: 'g1', groups: [{ groupId: 'g1a', language: 'es' }], sessionDate: '2026-10-06', startTime: '07:40', image: '/assets/session-default.svg' };
  render(<SessionForm familyOnly session={session} onCancel={() => {}} onSuccess={onSuccess} />);
  await screen.findByRole('option', { name: 'Group A' });
  expect(screen.getByLabelText('Grade')).toHaveValue('g1');
  expect(screen.getByLabelText('Group')).toHaveValue('g1a');
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1b' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const [url, options] = global.fetch.mock.calls.find(([, requestOptions]) => requestOptions?.method === 'PATCH');
  expect(url).toBe('/v1/sessions/session-1');
  expect(JSON.parse(options.body).assignments).toEqual([{ groupId: 'g1b', language: 'es' }]);
});

test('shows an error when the session cannot be saved', async () => {
  familyApi({ save: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: "Choose one of your children's grades for this session." } }) }) });
  render(<SessionForm familyOnly onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'Grade 1' });
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'g1' } });
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1a' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create session' }));
  expect(await screen.findByRole('alert')).toHaveTextContent("Choose one of your children's grades");
});

test('prevents creating a session for a past school-calendar date', async () => {
  familyApi();
  render(<SessionForm familyOnly onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'Grade 1' });
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'g1' } });
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1a' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2000-01-01' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Reading session form' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('You cannot create a reading session for a past date. Please select today or a future date.');
  expect(global.fetch.mock.calls.filter(([, options]) => options?.method === 'POST' && options.body?.includes('sessionDate'))).toHaveLength(0);
});

test('shows the clear duplicate-session message returned by the backend', async () => {
  const message = 'A reading session already exists for this grade and group on the selected date. Each group can have only one reading session per day.';
  familyApi({ save: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { code: 'DUPLICATE_SESSION', message } }) }) });
  render(<SessionForm familyOnly onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'Grade 1' });
  fireEvent.change(screen.getByLabelText('Grade'), { target: { value: 'g1' } });
  await screen.findByRole('option', { name: 'Group A' });
  fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1a' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(message);
});

test('shows selected session photo details and allows removing it', async () => {
  familyApi();
  render(<SessionForm familyOnly onCancel={() => {}} />);
  const input = screen.getByLabelText('Session photo upload');
  fireEvent.change(input, { target: { files: [new File(['photo-bytes'], 'reading-session.png', { type: 'image/png' })] } });

  expect(await screen.findByRole('img', { name: 'Selected session preview' })).toBeInTheDocument();
  expect(screen.getByText('reading-session.png')).toBeInTheDocument();
  expect(screen.getByText('1 KB')).toBeInTheDocument();
  fireEvent.change(input, { target: { files: [new File(['replacement'], 'replacement.jpg', { type: 'image/jpeg' })] } });
  expect(await screen.findByText('replacement.jpg')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(screen.queryByRole('img', { name: 'Selected session preview' })).not.toBeInTheDocument();
  expect(screen.getByText('Upload session photo')).toBeInTheDocument();
});

test('announces invalid session photo formats accessibly', async () => {
  familyApi();
  render(<SessionForm familyOnly onCancel={() => {}} />);
  const input = screen.getByLabelText('Session photo upload');
  fireEvent.change(input, { target: { files: [new File(['svg'], 'photo.svg', { type: 'image/svg+xml' })] } });

  expect(await screen.findByRole('alert')).toHaveTextContent('Please select a JPG, PNG, WebP, or GIF image.');
  expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('session-image-error'));
  expect(screen.getByText('Upload session photo')).toBeInTheDocument();
});

test('rejects session photos over the existing size limit', async () => {
  familyApi();
  render(<SessionForm familyOnly onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Session photo upload'), {
    target: { files: [new File([new Uint8Array(1.5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('This image exceeds the maximum allowed file size of 1.5 MB.');
});
