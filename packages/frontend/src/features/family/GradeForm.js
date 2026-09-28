import React, { useEffect, useState } from 'react';

function GradeForm({ schools, initialSchoolId = '', onCancel, onSuccess }) {
  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSchoolId(initialSchoolId), [initialSchoolId]);

  const submit = async event => {
    event.preventDefault();
    if (!schoolId) {
      setStatus({ type: 'error', message: 'Select a school before saving the grade.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch('/v1/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' }, body: JSON.stringify({ schoolId, name }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to save the grade.');
      onSuccess(payload);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  return <form className="family-form grade-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="app-eyebrow">Academic structure</p><h2>Add Grade</h2></div><button type="button" className="button-secondary" onClick={onCancel}>Back</button></div>
    <p className="form-help">A grade must belong to an existing school.</p>
    <label htmlFor="grade-school">School</label>
    <select id="grade-school" value={schoolId} onChange={event => setSchoolId(event.target.value)} required><option value="">Select a school</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select>
    <label htmlFor="grade-name">Grade name</label>
    <input id="grade-name" value={name} onChange={event => setName(event.target.value)} required />
    {status && <p className={`form-status ${status.type}`} role="alert">{status.message}</p>}
    <button type="submit" disabled={saving || !schoolId || !name.trim()}>{saving ? 'Saving...' : 'Save Grade'}</button>
  </form>;
}

export default GradeForm;