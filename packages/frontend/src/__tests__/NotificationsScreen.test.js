import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PreferencesProvider } from '../features/settings/PreferencesContext';
import NotificationsScreen from '../features/notification/NotificationsScreen';

const renderScreen = props => render(<PreferencesProvider><NotificationsScreen {...props} /></PreferencesProvider>);

test('shows a real empty state instead of sample notification activity', () => {
  renderScreen({ notifications: [] });
  expect(screen.getByText('No notification activity')).toBeInTheDocument();
  expect(screen.queryByText('Volunteer request')).not.toBeInTheDocument();
  expect(screen.queryByText('Teacher confirmation')).not.toBeInTheDocument();
});

test('warns admins to check the recipient inbox before retrying an unknown provider outcome', () => {
  const onRetry = jest.fn();
  renderScreen({ notifications: [
    { id: 'n-unknown', type: 'manual', channel: 'email', status: 'failed', failureCode: 'DELIVERY_OUTCOME_UNKNOWN', scheduledFor: '2026-09-29T12:05:00Z', retryCount: 0 },
  ], onRetry });

  expect(screen.getByRole('note')).toHaveTextContent('Provider outcome is unknown. Check the recipient inbox before retrying.');
  expect(screen.getByRole('button', { name: 'Retry manual notification' })).toBeInTheDocument();
});

test('shows provider status without recipient details and offers retry only for failed messages', () => {
  const onRetry = jest.fn();
  renderScreen({ notifications: [
    { id: 'n1', type: 'manual', channel: 'email', status: 'sent', scheduledFor: '2026-09-29T12:00:00Z', retryCount: 0, recipientId: 'private-recipient' },
    { id: 'n2', type: 'session_reminder', channel: 'email', status: 'failed', scheduledFor: '2026-09-29T12:05:00Z', retryCount: 2 },
  ], onRetry });

  expect(screen.getByText('manual')).toBeInTheDocument();
  expect(screen.getByText('sent')).toBeInTheDocument();
  expect(screen.getByText('failed')).toBeInTheDocument();
  expect(screen.queryByText('private-recipient')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry session_reminder notification' }));
  expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: 'n2', status: 'failed' }));
});
