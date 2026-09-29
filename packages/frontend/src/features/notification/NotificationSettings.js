import React, { useEffect, useRef, useState } from 'react';

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_SAVE_ERROR = "We couldn't save the notification message. Please try again.";
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
  const [messageError, setMessageError] = useState(null);
  const [messageMode, setMessageMode] = useState('edit');
  const [savingMessage, setSavingMessage] = useState(false);
  const savingMessageRef = useRef(false);

  useEffect(() => {
    fetch('/v1/notification-preferences', { headers: { 'x-user-role': 'coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load notification preferences.')))
      .then(payload => {
        setPreferences(payload.data);
        setDraft(payload.data.reminderMessage || '');
        // A message the user saved earlier opens read-only; the default text starts editable.
        setMessageMode(payload.data.customMessage ? 'view' : 'edit');
        setLoaded(true);
      })
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

  const persistMessage = async (reminderMessage, successMessage) => {
    // The ref blocks a second click that lands before React re-renders the disabled button.
    if (savingMessageRef.current) return;
    savingMessageRef.current = true;
    setSavingMessage(true);
    setMessageStatus(null);
    setMessageError(null);
    try {
      const response = await fetch('/v1/notification-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-role': 'coordinator' }, body: JSON.stringify({ reminderMessage }) });
      const payload = await response.json().catch(() => ({}));
      // Validation messages are written for users; anything else gets a generic message.
      if (!response.ok) throw new Error(response.status === 400 && payload.error?.message ? payload.error.message : MESSAGE_SAVE_ERROR);
      setPreferences(payload.data);
      setDraft(payload.data.reminderMessage);
      setMessageMode('view');
      setMessageStatus(successMessage);
    } catch (saveError) {
      setMessageError(saveError instanceof TypeError ? MESSAGE_SAVE_ERROR : saveError.message);
    } finally {
      savingMessageRef.current = false;
      setSavingMessage(false);
    }
  };

  const saveMessage = event => {
    event.preventDefault();
    if (!draft.trim()) { setMessageError('Please enter a reminder message.'); return; }
    persistMessage(draft, 'Reminder message saved.');
  };

  const editMessage = () => {
    setMessageStatus(null);
    setMessageError(null);
    setMessageMode('edit');
  };

  const restoreDefault = () => persistMessage(null, 'Default reminder message restored.');

  return (
    <section className="panel notification-settings" aria-label="Notification settings">
      <div className="panel-heading compact"><div><span className="section-kicker">Keep families informed</span><h1>Notifications</h1></div></div>
      {CHANNELS.map(channel => (
        <div className="switch-row" key={channel.key}>
          <div><strong id={`switch-${channel.key}`}>{channel.label}</strong><span>{channel.description}</span></div>
          <button type="button" role="switch" className="switch" aria-labelledby={`switch-${channel.key}`} aria-checked={preferences[channel.key]} disabled={!loaded || saving === channel.key} onClick={() => toggle(channel.key)}><span /></button>
        </div>
      ))}
      <form className="reminder-editor" aria-label="Reminder message settings" onSubmit={saveMessage}>
        <label htmlFor="reminder-message">Reminder message{messageMode === 'view' && <small> (saved)</small>}</label>
        <textarea id="reminder-message" rows="4" maxLength={MAX_MESSAGE_LENGTH} value={draft} disabled={!loaded} readOnly={messageMode === 'view' || savingMessage} aria-readonly={messageMode === 'view'} className={messageMode === 'view' ? 'is-read-only' : ''} onChange={event => { setDraft(event.target.value); setMessageStatus(null); setMessageError(null); }} required />
        <div className="reminder-editor-footer">
          <small>{draft.length}/{MAX_MESSAGE_LENGTH}</small>
          <div>
            {messageMode === 'view' && preferences.customMessage && <button type="button" className="button-secondary" disabled={savingMessage} onClick={restoreDefault}>Restore default</button>}
            {/* Distinct keys stop React reusing one element, which would turn the Edit click into a form submit. */}
            {messageMode === 'edit'
              ? <button key="save-message" type="submit" className="small-action" disabled={!loaded || savingMessage} aria-busy={savingMessage}>{savingMessage ? 'Saving...' : 'Save message'}</button>
              : <button key="edit-message" type="button" className="small-action" disabled={savingMessage} onClick={editMessage}>Edit message</button>}
          </div>
        </div>
        {messageStatus && <p className="form-status success" role="status">{messageStatus}</p>}
        {messageError && <p className="form-status error" role="alert">{messageError}</p>}
      </form>
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}

export default NotificationSettings;
