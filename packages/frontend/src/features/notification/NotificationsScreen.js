import React from 'react';

function NotificationsScreen({ notifications = [] }) {
  return (
    <section aria-label="Notifications">
      <h2>Notification status</h2>
      {notifications.map(notification => (
        <article key={notification.id}>
          <span>{notification.type}</span>
          <strong>{notification.status}</strong>
        </article>
      ))}
    </section>
  );
}

export default NotificationsScreen;
