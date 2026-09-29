import React, { useEffect, useState } from 'react';

export const DEFAULT_SESSION_IMAGE = '/assets/session-default.svg';
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const LANGUAGES = [{ code: 'es', name: 'Spanish' }, { code: 'en', name: 'English' }];

const getJson = url => fetch(url, { credentials: 'include' }).then(response => (response.ok ? response.json() : Promise.reject(new Error(url))));
const PAST_SESSION_MESSAGE = 'You cannot create a reading session for a past date. Please select today or a future date.';

function SelectField({ id, name, label, value, options, placeholder, onChange, disabled = false, required = false, error, helperText }) {
  const messageId = error || helperText ? `${id}-message` : undefined;
  return (
    <div className={`session-field session-field-${name}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        data-placeholder={!value}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <span id={messageId} className="session-field-error" role="alert">{error}</span>}
      {!error && helperText && <span id={messageId} className="session-field-help">{helperText}</span>}
    </div>
  );
}

const formatFileSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function getSchoolToday(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function SessionForm({ session = null, familyOnly = false, onCancel, onSuccess }) {
  const isEdit = Boolean(session);
  const firstGroup = session?.groups?.[0];
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ schoolId: session?.schoolId || '', gradeId: session?.gradeId || '', groupId: firstGroup?.groupId || '', teacherId: firstGroup?.teacherId || '', language: firstGroup?.language || 'es', date: session?.sessionDate || '', time: session?.startTime || '', image: session?.image || DEFAULT_SESSION_IMAGE });
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const timezone = schools.find(school => school.id === form.schoolId)?.timezone || session?.timezone || 'UTC';
  const today = getSchoolToday(timezone);
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  const loadGroups = gradeId => {
    setGroups([]);
    if (gradeId) getJson(`/v1/grades/${gradeId}/groups`).then(payload => setGroups(payload.data || [])).catch(() => setGroups([]));
  };

  const loadTeachers = schoolId => {
    setTeachers([]);
    if (schoolId) getJson(`/v1/teachers?schoolId=${encodeURIComponent(schoolId)}`).then(payload => setTeachers(payload.data || [])).catch(() => setTeachers([]));
  };

  useEffect(() => {
    if (familyOnly) {
      // Families schedule sessions for their own children's grades only.
      getJson('/v1/families/me')
        .then(payload => {
          const children = payload.data?.children || [];
          setGrades([...new Map(children.map(child => [child.gradeId, { id: child.gradeId, name: child.gradeName || 'Grade' }])).values()]);
          setForm(previous => ({ ...previous, schoolId: payload.data?.schoolId || '' }));
        })
        .catch(() => setGrades([]))
        .finally(() => setScopeLoaded(true));
      getJson('/v1/schools').then(payload => setSchools(payload.data || [])).catch(() => {});
    } else {
      getJson('/v1/schools').then(payload => setSchools(payload.data || [])).catch(() => setSchools([])).finally(() => setScopeLoaded(true));
      if (session?.schoolId) {
        getJson(`/v1/schools/${session.schoolId}/grades`).then(payload => setGrades(payload.data || [])).catch(() => setGrades([]));
        loadTeachers(session.schoolId);
      }
    }
    if (session?.gradeId) loadGroups(session.gradeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSchool = schoolId => {
    setForm(previous => ({ ...previous, schoolId, gradeId: '', groupId: '', teacherId: '' }));
    setGrades([]);
    setGroups([]);
    loadTeachers(schoolId);
    if (schoolId) getJson(`/v1/schools/${schoolId}/grades`).then(payload => setGrades(payload.data || [])).catch(() => setGrades([]));
  };

  const selectGrade = gradeId => {
    setForm(previous => ({ ...previous, gradeId, groupId: '', teacherId: '' }));
    loadGroups(gradeId);
  };

  const selectGroup = event => setForm(previous => ({ ...previous, groupId: event.target.value, teacherId: '' }));

  const selectImage = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setImageError(!ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? 'Please select a JPG, PNG, WebP, or GIF image.'
        : 'This image exceeds the maximum allowed file size of 1.5 MB.');
      return;
    }
    setSelectedFile(file);
    setImageError(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setForm(previous => ({ ...previous, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = async event => {
    event.preventDefault();
    if (!isEdit && form.date < today) {
      setError(PAST_SESSION_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    const fallback = isEdit ? 'Unable to update the reading session.' : 'Unable to create the reading session.';
    const assignment = { groupId: form.groupId, language: form.language, ...(!familyOnly && form.teacherId ? { teacherId: form.teacherId } : {}) };
    const details = { gradeId: form.gradeId, sessionDate: form.date, startTime: form.time, endTime: form.time, image: form.image, assignments: [assignment], ...(familyOnly ? {} : { schoolId: form.schoolId }) };
    try {
      const response = await fetch(isEdit ? `/v1/sessions/${session.id}` : '/v1/sessions', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify(details),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || fallback);
      if (onSuccess) onSuccess(payload);
    } catch (submitError) {
      setError(submitError.message || fallback);
      setSaving(false);
    }
  };

  const removeImage = () => {
    setForm(previous => ({ ...previous, image: DEFAULT_SESSION_IMAGE }));
    setSelectedFile(null);
    setImageError(null);
  };

  return (
    <form className="family-form session-form" aria-label="Reading session form" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="app-eyebrow">Operations</p><h2>{isEdit ? 'Edit Reading Session' : 'New Reading Session'}</h2></div>
        <button type="button" className="button-secondary" onClick={onCancel}>Back</button>
      </div>
      <p className="form-help">Set the schedule first, then add groups and volunteer coverage.</p>
      <section className="session-photo-field" aria-labelledby="session-photo-label">
        <span className="session-photo-label" id="session-photo-label">Session photo</span>
        <input id="session-image" className="visually-hidden session-photo-input" name="image" type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={selectImage} aria-label="Session photo upload" aria-describedby={`${imageError ? 'session-image-error ' : ''}session-image-help`} />
        {form.image !== DEFAULT_SESSION_IMAGE ? (
          <div className="session-photo-selected">
            <img src={form.image} alt="Selected session preview" />
            <div className="session-photo-details">
              <strong>{selectedFile?.name || 'Current session photo'}</strong>
              <span>{selectedFile ? formatFileSize(selectedFile.size) : 'Ready to use'}</span>
            </div>
            <div className="session-photo-actions">
              <label className="session-photo-action" htmlFor="session-image">Replace</label>
              <button type="button" className="session-photo-action remove" onClick={removeImage}>Remove</button>
            </div>
          </div>
        ) : (
          <label className="session-photo-upload" htmlFor="session-image">
            <span className="session-photo-icon" aria-hidden="true">▧</span>
            <span className="session-photo-copy"><strong>Upload session photo</strong><small>JPG, PNG, WebP or GIF · Maximum 1.5 MB</small></span>
            <span className="session-photo-browse" aria-hidden="true">Browse</span>
          </label>
        )}
        {imageError && <span id="session-image-error" className="session-field-error" role="alert">{imageError}</span>}
        <span id="session-image-help" className="visually-hidden">Choose a JPG, PNG, WebP, or GIF image up to 1.5 MB.</span>
      </section>
      {familyOnly && scopeLoaded && grades.length === 0 && <p className="form-status error" role="alert">Register your children in My Family before scheduling a session for their grade.</p>}
      <div className="session-fields">
        {!familyOnly && <SelectField id="session-school" name="schoolId" label="School" value={form.schoolId} placeholder="Select a school" options={schools.map(school => ({ value: school.id, label: school.name }))} onChange={event => selectSchool(event.target.value)} required />}
        <SelectField id="session-grade" name="gradeId" label="Grade" value={form.gradeId} placeholder={familyOnly ? "Select one of your children's grades" : 'Select a grade'} options={grades.map(grade => ({ value: grade.id, label: grade.name }))} disabled={grades.length === 0} onChange={event => selectGrade(event.target.value)} required />
        <SelectField id="session-group" name="groupId" label="Group" value={form.groupId} placeholder={!form.gradeId ? 'Select a grade first' : groups.length ? 'Select a group' : 'No groups registered for this grade yet'} options={groups.map(group => ({ value: group.id, label: group.name }))} disabled={!form.gradeId} onChange={selectGroup} required />
        {!familyOnly && <SelectField id="session-teacher" name="teacherId" label="Assigned teacher (optional)" value={form.teacherId} placeholder={!form.schoolId ? 'Select a school first' : teachers.length ? 'No teacher assigned' : 'No teachers registered for this school'} options={teachers.map(teacher => ({ value: teacher.id, label: teacher.name }))} disabled={!form.schoolId || teachers.length === 0} onChange={update} />}
        <SelectField id="session-language" name="language" label="Language" value={form.language} placeholder="Select a language" options={LANGUAGES.map(language => ({ value: language.code, label: language.name }))} onChange={update} required />
      </div>
      <div className="session-fields session-schedule-fields">
        <div className="session-field"><label htmlFor="session-date">Date</label><input id="session-date" name="date" type="date" value={form.date} min={!isEdit ? today : undefined} onChange={event => { update(event); setError(event.target.value < today ? PAST_SESSION_MESSAGE : null); }} required /></div>
        <div className="session-field"><label htmlFor="session-time">Start time</label><input id="session-time" name="time" type="time" value={form.time} onChange={update} required /></div>
      </div>
      {error && <p className="form-status error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create session'}</button>
    </form>
  );
}

export default SessionForm;
