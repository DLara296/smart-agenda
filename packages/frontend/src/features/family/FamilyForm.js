import React, { useState } from 'react';

function FamilyForm({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
    displayName: '',
    schoolId: '',
    guardianName: '',
    guardianEmail: '',
    relationship: '',
    supportedLanguages: '',
    childName: '',
    gradeId: '',
    groupId: '',
  });
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = event => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async event => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/v1/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({
          displayName: form.displayName,
          schoolId: form.schoolId,
          guardians: [{
            name: form.guardianName,
            email: form.guardianEmail,
            relationship: form.relationship,
            supportedLanguages: form.supportedLanguages.split(',').map(language => language.trim()).filter(Boolean),
          }],
          children: [{ name: form.childName, gradeId: form.gradeId, groupId: form.groupId }],
        }),
      });
      if (!response.ok) throw new Error('The family could not be saved.');
      setStatus({ type: 'success', message: 'Family registered successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'The family could not be saved.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="family-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="app-eyebrow">Protected household record</p>
          <h2>Register Family</h2>
        </div>
        <button type="button" className="button-secondary" onClick={onCancel}>Back</button>
      </div>

      <fieldset>
        <legend>Household</legend>
        <label htmlFor="displayName">Family name</label>
        <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} required />
        <label htmlFor="schoolId">School ID</label>
        <input id="schoolId" name="schoolId" value={form.schoolId} onChange={updateField} required />
      </fieldset>

      <fieldset>
        <legend>Guardian</legend>
        <label htmlFor="guardianName">Full name</label>
        <input id="guardianName" name="guardianName" value={form.guardianName} onChange={updateField} required />
        <label htmlFor="guardianEmail">Email</label>
        <input id="guardianEmail" name="guardianEmail" type="email" value={form.guardianEmail} onChange={updateField} required />
        <label htmlFor="relationship">Relationship</label>
        <input id="relationship" name="relationship" placeholder="Parent or guardian" value={form.relationship} onChange={updateField} required />
        <label htmlFor="supportedLanguages">Languages</label>
        <input id="supportedLanguages" name="supportedLanguages" placeholder="en, es" value={form.supportedLanguages} onChange={updateField} required />
      </fieldset>

      <fieldset>
        <legend>Child</legend>
        <label htmlFor="childName">Full name</label>
        <input id="childName" name="childName" value={form.childName} onChange={updateField} required />
        <label htmlFor="gradeId">Grade ID</label>
        <input id="gradeId" name="gradeId" value={form.gradeId} onChange={updateField} required />
        <label htmlFor="groupId">Group ID</label>
        <input id="groupId" name="groupId" value={form.groupId} onChange={updateField} required />
      </fieldset>

      <p className="privacy-note" role="note">Family and child information is protected and visible only to authorized school coordinators and the household.</p>
      {status && <p className={`form-status ${status.type}`} role="status">{status.message}</p>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register'}</button>
    </form>
  );
}

export default FamilyForm;
