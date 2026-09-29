import React, { useEffect, useState } from 'react';

const EMPTY_SCHOOL = { name: '', timezone: 'UTC', locale: 'en-US' };

async function apiRequest(url, options) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...(options?.headers || {}), ...(options?.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'We could not complete this school request. Please try again.');
  return payload.data;
}

function SchoolForm({ mode, school, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_SCHOOL, ...(school || {}) }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit';

  useEffect(() => {
    setValues({ ...EMPTY_SCHOOL, ...(school || {}) });
    setErrors({});
    setSubmitError('');
  }, [school]);

  const update = event => {
    setValues(current => ({ ...current, [event.target.name]: event.target.value }));
    setErrors(current => ({ ...current, [event.target.name]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = 'Enter a school name.';
    try { new Intl.DateTimeFormat('en-US', { timeZone: values.timezone }).format(); } catch { next.timezone = 'Enter a valid time zone, such as America/Mexico_City.'; }
    try { Intl.getCanonicalLocales(values.locale); } catch { next.locale = 'Enter a valid locale, such as en-US.'; }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async event => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ name: values.name.trim(), timezone: values.timezone.trim(), locale: values.locale.trim() });
    } catch (error) {
      setSubmitError(error.message || 'We could not save this school. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel school-management-form" aria-label={isEdit ? 'Edit school form' : 'Create school form'} onSubmit={submit} noValidate>
      <div className="panel-heading compact school-management-heading">
        <div><span className="section-kicker">School management</span><h1>{isEdit ? 'Edit School' : 'Create School'}</h1></div>
        <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>
      </div>
      <p className="form-help">Update the school name and its regional settings.</p>
      <div className="school-form-grid">
        <div className="session-field school-form-name">
          <label htmlFor="managed-school-name">School name <span aria-hidden="true">*</span></label>
          <input id="managed-school-name" name="name" value={values.name} onChange={update} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'managed-school-name-error' : undefined} />
          {errors.name && <span className="session-field-error" id="managed-school-name-error">{errors.name}</span>}
        </div>
        <div className="session-field">
          <label htmlFor="managed-school-timezone">Timezone <span aria-hidden="true">*</span></label>
          <input id="managed-school-timezone" name="timezone" value={values.timezone} onChange={update} required placeholder="America/Mexico_City" aria-invalid={Boolean(errors.timezone)} aria-describedby={errors.timezone ? 'managed-school-timezone-error' : undefined} />
          {errors.timezone && <span className="session-field-error" id="managed-school-timezone-error">{errors.timezone}</span>}
        </div>
        <div className="session-field">
          <label htmlFor="managed-school-locale">Locale <span aria-hidden="true">*</span></label>
          <input id="managed-school-locale" name="locale" value={values.locale} onChange={update} required placeholder="en-US" aria-invalid={Boolean(errors.locale)} aria-describedby={errors.locale ? 'managed-school-locale-error' : undefined} />
          {errors.locale && <span className="session-field-error" id="managed-school-locale-error">{errors.locale}</span>}
        </div>
      </div>
      {submitError && <p className="form-status error" role="alert">{submitError}</p>}
      <div className="school-form-actions">
        <button type="button" className="button-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create School'}</button>
      </div>
    </form>
  );
}

function SchoolManagement() {
  const [schools, setSchools] = useState([]);
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSchools = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setSchools(await apiRequest('/v1/admin/schools'));
    } catch {
      setLoadError("We couldn't load the schools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchools(); }, []);

  useEffect(() => {
    if (view !== 'edit' || !selectedId) return;
    let active = true;
    setSelectedSchool(null);
    apiRequest(`/v1/admin/schools/${encodeURIComponent(selectedId)}`)
      .then(school => { if (active) setSelectedSchool(school); })
      .catch(error => { if (active) setLoadError(error.message || 'We could not load this school.'); });
    return () => { active = false; };
  }, [view, selectedId]);

  const saveSchool = async values => {
    const isEdit = view === 'edit';
    const url = isEdit ? `/v1/admin/schools/${encodeURIComponent(selectedId)}` : '/v1/admin/schools';
    const saved = await apiRequest(url, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(values) });
    setSchools(current => isEdit ? current.map(school => school.id === saved.id ? saved : school) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(null);
    setSelectedSchool(null);
    setView('list');
    setNotice(isEdit ? 'School updated successfully.' : 'School created successfully.');
  };

  if (view === 'create') return <SchoolForm mode="create" onCancel={() => setView('list')} onSubmit={saveSchool} />;
  if (view === 'edit') {
    if (loadError) return <section className="panel school-management-state" role="alert"><h1>School unavailable</h1><p>{loadError}</p><button type="button" className="button-secondary" onClick={() => { setLoadError(''); setView('list'); }}>Back to Schools</button></section>;
    if (!selectedSchool) return <section className="panel school-management-state" role="status">Loading school...</section>;
    return <SchoolForm mode="edit" school={selectedSchool} onCancel={() => { setView('list'); setSelectedSchool(null); }} onSubmit={saveSchool} />;
  }

  return (
    <section className="panel directory-panel school-management" aria-label="Schools">
      <div className="panel-heading compact school-management-heading">
        <div><span className="section-kicker">Administration</span><h1>Schools</h1><p>Manage schools registered in SmartAgenda.</p></div>
        <button type="button" className="primary-action" onClick={() => { setNotice(''); setView('create'); }}>＋ Add School</button>
      </div>
      {notice && <p className="form-status success" role="status">{notice}</p>}
      {loading ? <div className="school-management-state" role="status">Loading schools...</div>
        : loadError ? <div className="school-management-state" role="alert"><strong>{loadError}</strong><button type="button" className="button-secondary" onClick={loadSchools}>Try Again</button></div>
          : schools.length === 0 ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">⌂</span><strong>No schools registered yet</strong><p>Add your first school to start organizing grades, groups, teachers, students, and reading sessions.</p><button type="button" className="primary-action" onClick={() => setView('create')}>＋ Add School</button></div>
            : <div className="school-list" aria-label="Registered schools">{schools.map(school => <article className="school-list-item" key={school.id}><div className="school-list-mark" aria-hidden="true">⌂</div><div className="school-list-details"><h2>{school.name}</h2><span>{school.timezone} · {school.locale}</span></div><button type="button" className="button-secondary" aria-label={`Edit ${school.name}`} onClick={() => { setNotice(''); setSelectedId(school.id); setLoadError(''); setView('edit'); }}>Edit</button></article>)}</div>}
    </section>
  );
}

export default SchoolManagement;
