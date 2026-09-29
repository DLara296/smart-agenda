import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ActionForm from '../features/workflow/ActionForm';

const response = data => Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });
const originalFetch = global.fetch;

afterEach(() => { global.fetch = originalFetch; });

test('confirms a volunteer assignment action', () => {
  render(<ActionForm type="volunteer" onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Volunteer'), { target: { value: 'Maria Gonzalez' } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign volunteer' }));
  expect(screen.getByText('Volunteer assignment saved.')).toBeInTheDocument();
});

test('shows that a selected notification channel is not implemented and never submits it', async () => {
  const fetchMock = jest.fn((url, options) => {
    if (url === '/v1/schools') return response([{ id: 'school-1', name: 'School One' }]);
    if (url.startsWith('/v1/notification-recipients')) return response([{ id: 'guardian-1', type: 'guardian', name: 'Maria Gonzalez', role: 'Parent', active: true, eligibleChannels: ['email', 'sms', 'whatsapp'] }]);
    if (url.startsWith('/v1/notification-groups')) return response([]);
    if (url === '/v1/notifications' && options.method === 'POST') return response({ recipientCount: 1, unavailableCount: 0 });
    throw new Error(`Unexpected request: ${url}`);
  });
  global.fetch = fetchMock;
  render(<ActionForm type="notification" onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'School One' });
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-1' } });
  await screen.findByText('Maria Gonzalez');
  fireEvent.click(screen.getByRole('checkbox', { name: /Maria Gonzalez/ }));
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please confirm.' } });
  expect(await screen.findByRole('status')).toHaveTextContent('Delivery is not implemented yet. No message was sent.');
  expect(screen.getByRole('button', { name: 'Send notification' })).toBeDisabled();
  for (const channel of ['sms', 'email', 'whatsapp']) {
    fireEvent.change(screen.getByLabelText('Channel for individuals'), { target: { value: channel } });
    expect(screen.getByRole('status')).toHaveTextContent('Delivery is not implemented yet. No message was sent.');
    expect(screen.getByRole('button', { name: 'Send notification' })).toBeDisabled();
  }
  expect(fetchMock).not.toHaveBeenCalledWith('/v1/notifications', expect.objectContaining({ method: 'POST' }));
});

test('creates a saved group only after selecting a channel-eligible member', async () => {
  const member = { id: 'guardian-1', type: 'guardian', name: 'Maria Gonzalez', role: 'Parent', active: true, eligibleChannels: ['email', 'sms', 'whatsapp'] };
  const group = { id: 'group-1', schoolId: 'school-1', name: 'Grade 1 Parents', channel: 'whatsapp', members: [member] };
  const fetchMock = jest.fn((url, options) => {
    if (url === '/v1/schools') return response([{ id: 'school-1', name: 'School One' }]);
    if (url.startsWith('/v1/notification-recipients')) return response([member]);
    if (url.startsWith('/v1/notification-groups') && options.method === 'POST') return response(group);
    if (url.startsWith('/v1/notification-groups')) return response([]);
    throw new Error(`Unexpected request: ${url}`);
  });
  global.fetch = fetchMock;
  render(<ActionForm type="notification" onCancel={() => {}} />);
  await screen.findByRole('option', { name: 'School One' });
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'school-1' } });
  await screen.findAllByText('Maria Gonzalez');
  fireEvent.click(screen.getByRole('button', { name: /create notification group/i }));
  fireEvent.change(screen.getByLabelText('Group name *'), { target: { value: 'Grade 1 Parents' } });
  fireEvent.click(screen.getAllByRole('checkbox', { name: /Maria Gonzalez/ })[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

  expect(await screen.findByText('Saved Grade 1 Parents.')).toBeInTheDocument();
  expect(screen.getByText('Delivery is not implemented yet. No message was sent.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send notification' })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledWith('/v1/notification-groups', expect.objectContaining({ method: 'POST' }));
  expect(screen.getByText(/Grade 1 Parents · WhatsApp/)).toBeInTheDocument();
});