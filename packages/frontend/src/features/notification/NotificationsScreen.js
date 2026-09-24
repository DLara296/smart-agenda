import React from 'react';

function NotificationsScreen({ notifications = [] }) {
  return (
    <section className="panel communication-panel" aria-label="Notifications">
      <div className="panel-heading compact"><div><span className="section-kicker">Keep families informed</span><h2>Communication</h2></div><button className="text-action">View all</button></div>
      {notifications.length === 0 ? <>
        <div className="communication-item"><span className="channel-icon whatsapp">◌</span><div><strong>Volunteer request</strong><span>WhatsApp · Scheduled today, 6:00 PM</span></div><span className="status-dot scheduled">Scheduled</span></div>
        <div className="communication-item"><span className="channel-icon email">✉</span><div><strong>Teacher confirmation</strong><span>Email · Pending</span></div><span className="status-dot pending">Pending</span></div>
        <div className="communication-item"><span className="channel-icon sms">▣</span><div><strong>Volunteer reminder</strong><span>SMS · Tomorrow, 8:00 AM</span></div><span className="status-dot scheduled">Scheduled</span></div>
      </> : notifications.map(notification => <div className="communication-item" key={notification.id}><span className="channel-icon">✉</span><div><strong>{notification.type}</strong><span>{notification.channel}</span></div><span className="status-dot">{notification.status}</span></div>)}
    </section>
  );
}

export default NotificationsScreen;
