import React from 'react';
import { usePreferences } from '../settings/PreferencesContext';

function NotificationsScreen({ notifications = [], onRetry }) {
  const { formatDate, formatTime } = usePreferences();
  const channelIcon = channel => channel === 'whatsapp' ? '◌' : channel === 'sms' ? '▣' : '✉';
  return (
    <section className="panel communication-panel" aria-label="Notifications">
      <div className="panel-heading compact"><div><span className="section-kicker">School-scoped activity</span><h2>Notification history</h2></div></div>
      {notifications.length === 0
        ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">✉</span><strong>No notification activity</strong><p>Queued and provider outcomes for this school will appear here.</p></div>
        : notifications.map(notification => (
          <div className="communication-item" key={notification.id}>
            <span className={`channel-icon ${notification.channel}`}>{channelIcon(notification.channel)}</span>
            <div>
              <strong>{String(notification.type || 'Notification').replaceAll('_', ' ')}</strong>
              <span>{notification.channel}{notification.scheduledFor ? ` · ${formatDate(notification.scheduledFor)} ${formatTime(notification.scheduledFor)}` : ''}{notification.retryCount ? ` · ${notification.retryCount} retries` : ''}</span>
              {notification.failureCode === 'DELIVERY_OUTCOME_UNKNOWN' && <span className="notification-outcome-warning" role="note">Provider outcome is unknown. Check the recipient inbox before retrying.</span>}
            </div>
            <span className={`status-dot ${notification.status}`}>{notification.status}</span>
            {notification.status === 'failed' && onRetry && <button type="button" className="text-action" aria-label={`Retry ${notification.type} notification`} onClick={() => onRetry(notification)}>Retry</button>}
          </div>
        ))}
    </section>
  );
}

export default NotificationsScreen;
