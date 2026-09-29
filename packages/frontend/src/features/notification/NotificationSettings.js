import React, { useEffect, useState } from 'react';

const MAX_MESSAGE_LENGTH = 500;
const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp notifications', description: 'Send a WhatsApp reminder when a new session is coming.' },
  { key: 'email', label: 'Email notifications', description: 'Send an email reminder when a new session is coming.' },
];

function NotificationSettings() {
  const [preferences, setPreferences] = useState({ whatsapp: false, email: false, reminderMessage: '', customMessage: false });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [messageStatus, setMessageStatus] = useState(null);

  useEffect(() => {
    fetch('/v1/notification-preferences', { headers: { 'x-user-role': 'coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load notification preferences.')))
      .then(payload => { setPreferences(payload.data); setDraft(payload.data.reminderMessage || ''); setLoaded(true); })
      .catch(loadError => setError(loadError.message));
  }, []);

  const save = async (changes, savingKey) => {
    setSaving(savingKey);
    setError(null);
    try {
      const response = await fetch('/v1/notification-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-role': 'coordinator' }, body: JSON.stringify(changes) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to save notification preferences.');
      setPreferences(payload.data);
      return payload.data;
    } catch (saveError) {
      setError(saveError.message);
      return null;
    } finally {
      setSaving(null);
    }
  };

  const toggle = key => save({ [key]: !preferences[key] }, key);

  const saveMessage = async event => {
    event.preventDefault();
    setMessageStatus(null);
    const saved = await save({ reminderMessage: draft }, 'message');
    if (saved) { setDraft(saved.reminderMessage); setMessageStatus('Reminder message saved.'); }
  };

  const restoreDefault = async () => {
    setMessageStatus(null);
    const saved = await save({ reminderMessage: null }, 'message');
    if (saved) { setDraft(saved.reminderMessage); setMessageStatus('Default reminder message restored.'); }
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
      <form className="reminder-editor" onSubmit={saveMessage}>
        <label htmlFor="reminder-message">Reminder message</label>
        <textarea id="reminder-message" rows="4" maxLength={MAX_MESSAGE_LENGTH} value={draft} disabled={!loaded} onChange={event => { setDraft(event.target.value); setMessageStatus(null); }} required />
        <div className="reminder-editor-footer">
          <small>{draft.length}/{MAX_MESSAGE_LENGTH}</small>
          <div>
            {preferences.customMessage && <button type="button" className="button-secondary" disabled={saving === 'message'} onClick={restoreDefault}>Restore default</button>}
            <button type="submit" className="small-action" disabled={!loaded || saving === 'message' || !draft.trim() || draft === preferences.reminderMessage}>{saving === 'message' ? 'Saving...' : 'Save message'}</button>
          </div>
        </div>
        {messageStatus && <p className="form-status success" role="status">{messageStatus}</p>}
      </form>
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}

export default NotificationSettings;
