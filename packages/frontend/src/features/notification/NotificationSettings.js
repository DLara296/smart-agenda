import React, { useEffect, useState } from 'react';

const REMINDER_MESSAGE = 'Your next lecture session is coming, be ready, prepare and enjoyed. Dont forget take a picture of the moment and save it in SmartAgenda';
const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp notifications', description: 'Send a WhatsApp reminder when a new session is coming.' },
  { key: 'email', label: 'Email notifications', description: 'Send an email reminder when a new session is coming.' },
];

function NotificationSettings() {
  const [preferences, setPreferences] = useState({ whatsapp: false, email: false });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/v1/notification-preferences', { headers: { 'x-user-role': 'coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load notification preferences.')))
      .then(payload => { setPreferences(payload.data); setLoaded(true); })
      .catch(loadError => setError(loadError.message));
  }, []);

  const toggle = async key => {
    const next = { ...preferences, [key]: !preferences[key] };
    setSaving(key);
    setError(null);
    try {
      const response = await fetch('/v1/notification-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-role': 'coordinator' }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error('Unable to save notification preferences.');
      const payload = await response.json();
      setPreferences(payload.data);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="panel notification-settings" aria-label="Notification settings">
      <div className="panel-heading compact"><div><span className="section-kicker">Keep families informed</span><h1>Notifications</h1></div></div>
      {CHANNELS.map(channel => (
        <div className="switch-row" key={channel.key}>
          <div><strong id={`switch-${channel.key}`}>{channel.label}</strong><span>{channel.description}</span></div>
          <button type="button" role="switch" className="switch" aria-labelledby={`switch-${channel.key}`} aria-checked={preferences[channel.key]} disabled={!loaded || saving === channel.key} onClick={() => toggle(channel.key)}><span /></button>
        </div>
      ))}
      <div className="reminder-preview"><small>Reminder message</small><p>{REMINDER_MESSAGE}</p></div>
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}

export default NotificationSettings;
