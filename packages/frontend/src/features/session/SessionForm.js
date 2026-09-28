import React, { useState } from 'react';

export const DEFAULT_SESSION_IMAGE = '/assets/session-default.svg';
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function SessionForm({ session = null, onCancel, onSuccess }) {
  const isEdit = Boolean(session);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ grade: session?.gradeId || '', date: session?.sessionDate || '', time: session?.startTime || '', image: session?.image || DEFAULT_SESSION_IMAGE });
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  const selectImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError('Choose a PNG, JPEG, WEBP, or GIF image under 1.5 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setForm(previous => ({ ...previous, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const fallback = isEdit ? 'Unable to update the reading session.' : 'Unable to create the reading session.';
    const details = { gradeId: form.grade, sessionDate: form.date, startTime: form.time, endTime: form.time, image: form.image };
    try {
      const response = await fetch(isEdit ? `/v1/sessions/${session.id}` : '/v1/sessions', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify(isEdit ? details : { schoolId: 'school-1', ...details, assignments: [] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || fallback);
      if (onSuccess) onSuccess(payload);
    } catch (submitError) {
      setError(submitError.message || fallback);
      setSaving(false);
    }
  };

  return (
    <form className="family-form session-form" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="app-eyebrow">Operations</p><h2>{isEdit ? 'Edit Reading Session' : 'New Reading Session'}</h2></div>
        <button type="button" className="button-secondary" onClick={onCancel}>Back</button>
      </div>
      <p className="form-help">Set the schedule first, then add groups and volunteer coverage.</p>
      <img className="session-image-preview" src={form.image} alt="Session" />
      <label htmlFor="session-image">Session photo</label>
      <input id="session-image" name="image" type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={selectImage} />
      {form.image !== DEFAULT_SESSION_IMAGE && <button type="button" className="button-secondary" onClick={() => setForm(previous => ({ ...previous, image: DEFAULT_SESSION_IMAGE }))}>Use default image</button>}
      <label htmlFor="session-grade">Grade</label>
      <input id="session-grade" name="grade" placeholder="Grade 1" value={form.grade} onChange={update} required />
      <label htmlFor="session-date">Date</label>
      <input id="session-date" name="date" type="date" value={form.date} onChange={update} required />
      <label htmlFor="session-time">Start time</label>
      <input id="session-time" name="time" type="time" value={form.time} onChange={update} required />
      {error && <p className="form-status error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create session'}</button>
    </form>
  );
}

export default SessionForm;
