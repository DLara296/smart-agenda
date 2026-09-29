import React, { useEffect, useState } from 'react';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';

const EMPTY_SCHOOL = { name: '', timezone: 'UTC', locale: 'en-US' };
const EMPTY_STRUCTURE = [];

async function apiRequest(url, options) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...(options?.headers || {}), ...(options?.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'We could not complete this school request. Please try again.');
  return payload.data ?? payload;
}

const isDraft = id => String(id || '').startsWith('draft-');
const draftId = type => `draft-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function SchoolForm({ mode, school, structure = EMPTY_STRUCTURE, teachers = [], onCancel, onSchoolSaved, onComplete, onAddTeacher }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_SCHOOL, ...(school || {}) }));
  const [grades, setGrades] = useState(structure);
  const [savedSchool, setSavedSchool] = useState(school || null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [groupDrafts, setGroupDrafts] = useState({});
  const isEdit = mode === 'edit';

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

  const addDraftGrade = () => {
    const name = newGradeName.trim();
    if (!name) { setGradeError('Enter a grade name.'); return; }
    setGrades(current => [...current, { id: draftId('grade'), name, academicPeriod: null, groups: [] }]);
    setNewGradeName('');
    setGradeError('');
  };

  const addDraftGroup = gradeId => {
    const name = (groupDrafts[gradeId] || '').trim();
    if (!name) return;
    setGrades(current => current.map(grade => grade.id === gradeId
      ? { ...grade, groups: [...grade.groups, { id: draftId('group'), gradeId, name, code: name.toUpperCase().replace(/\s+/g, '-') }] }
      : grade));
    setGroupDrafts(current => ({ ...current, [gradeId]: '' }));
  };

  const persistStructure = async (schoolId, startingGrades) => {
    let pendingGrades = startingGrades;
    for (let gradeIndex = 0; gradeIndex < pendingGrades.length; gradeIndex += 1) {
      let grade = pendingGrades[gradeIndex];
      if (isDraft(grade.id)) {
        const created = await apiRequest('/v1/grades', { method: 'POST', body: JSON.stringify({ schoolId, name: grade.name, academicPeriod: grade.academicPeriod || null }) });
        const updatedGrades = [...pendingGrades];
        updatedGrades[gradeIndex] = { ...grade, ...created, groups: grade.groups };
        pendingGrades = updatedGrades;
        grade = pendingGrades[gradeIndex];
        setGrades(pendingGrades);
      }
      for (let groupIndex = 0; groupIndex < grade.groups.length; groupIndex += 1) {
        const group = grade.groups[groupIndex];
        if (!isDraft(group.id)) continue;
        const created = await apiRequest('/v1/groups', { method: 'POST', body: JSON.stringify({ gradeId: grade.id, name: group.name, code: group.code }) });
        const updatedGroups = [...grade.groups];
        updatedGroups[groupIndex] = created;
        grade = { ...grade, groups: updatedGroups };
        const updatedGrades = [...pendingGrades];
        updatedGrades[gradeIndex] = grade;
        pendingGrades = updatedGrades;
        setGrades(pendingGrades);
      }
    }
  };

  const submit = async event => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const body = { name: values.name.trim(), timezone: values.timezone.trim(), locale: values.locale.trim() };
      const url = savedSchool ? `/v1/admin/schools/${encodeURIComponent(savedSchool.id)}` : '/v1/admin/schools';
      const persisted = await apiRequest(url, { method: savedSchool ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setSavedSchool(persisted);
      onSchoolSaved(persisted);
      try {
        await persistStructure(persisted.id, grades);
      } catch (structureError) {
        setSubmitError(`School saved, but some academic structure could not be saved. Retry to continue; completed items are preserved. ${structureError.message}`);
        return;
      }
      onComplete(persisted, isEdit ? 'School updated successfully.' : 'School created successfully.');
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
      <section className="school-structure" aria-labelledby="academic-structure-title">
        <div className="school-subsection-heading"><div><h2 id="academic-structure-title">Academic Structure</h2><p>School → Grade → Group</p></div></div>
        {grades.length === 0 && <p className="school-structure-empty">No grades have been added to this school yet.</p>}
        <div className="school-grade-list">{grades.map(grade => (
          <article className="school-grade-item" key={grade.id}>
            <div className="school-grade-heading">
              <div><h3>{grade.name}</h3><span>{grade.groups.length} {grade.groups.length === 1 ? 'Group' : 'Groups'}</span></div>
              {isDraft(grade.id) && <button type="button" className="school-remove-action" aria-label={`Remove ${grade.name}`} onClick={() => setGrades(current => current.filter(item => item.id !== grade.id))}>Remove</button>}
            </div>
            <div className="school-group-list" aria-label={`${grade.name} groups`}>
              {grade.groups.length === 0 ? <p className="school-structure-empty">No groups have been added to this grade yet.</p> : grade.groups.map(group => (
                <div className="school-group-item" key={group.id}><span>{group.name}</span>{isDraft(group.id) && <button type="button" className="school-remove-action" aria-label={`Remove ${group.name} from ${grade.name}`} onClick={() => setGrades(current => current.map(item => item.id === grade.id ? { ...item, groups: item.groups.filter(child => child.id !== group.id) } : item))}>Remove</button>}</div>
              ))}
            </div>
            <div className="school-add-group">
              <label htmlFor={`new-group-${grade.id}`}>Add Group to {grade.name}</label>
              <div><input id={`new-group-${grade.id}`} value={groupDrafts[grade.id] || ''} onChange={event => setGroupDrafts(current => ({ ...current, [grade.id]: event.target.value }))} placeholder="Group name" /><button type="button" className="button-secondary" disabled={!(groupDrafts[grade.id] || '').trim()} onClick={() => addDraftGroup(grade.id)}>＋ Add Group</button></div>
            </div>
          </article>
        ))}</div>
        <div className="school-add-grade">
          <label htmlFor="new-school-grade">Add Grade</label>
          <div><input id="new-school-grade" value={newGradeName} onChange={event => { setNewGradeName(event.target.value); setGradeError(''); }} placeholder="Grade name" aria-invalid={Boolean(gradeError)} aria-describedby={gradeError ? 'new-school-grade-error' : undefined} /><button type="button" className="button-secondary" disabled={!newGradeName.trim()} onClick={addDraftGrade}>＋ Add Grade</button></div>
          {gradeError && <span className="session-field-error" id="new-school-grade-error">{gradeError}</span>}
        </div>
      </section>
      <section className="school-teachers" aria-labelledby="school-teachers-title">
        <div className="school-subsection-heading"><div><h2 id="school-teachers-title">Teachers</h2><p>Teachers are added through Teacher management.</p></div></div>
        {teachers.map(teacher => <div className="school-teacher-row" key={teacher.id}><strong>{teacher.name}</strong><span>{teacher.email || teacher.phone || 'Active'}</span></div>)}
        {savedSchool
          ? <button type="button" className="button-secondary" disabled={grades.some(grade => isDraft(grade.id) || grade.groups.some(group => isDraft(group.id)))} onClick={() => onAddTeacher(savedSchool)}>＋ Add Teacher</button>
          : <p className="school-structure-empty">Save this School and its academic structure before adding Teachers.</p>}
      </section>
      {submitError && <p className="form-status error" role="alert">{submitError}</p>}
      <div className="school-form-actions">
        <button type="button" className="button-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create School'}</button>
      </div>
    </form>
  );
}

function SchoolManagement({ initialSchoolId = null, onAddTeacher }) {
  const [schools, setSchools] = useState([]);
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [structure, setStructure] = useState(EMPTY_STRUCTURE);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    if (!initialSchoolId) return;
    setSelectedId(initialSchoolId);
    setLoadError('');
    setView('edit');
  }, [initialSchoolId]);

  useEffect(() => {
    if (view !== 'edit' || !selectedId) return;
    let active = true;
    setSelectedSchool(null);
    setStructure(EMPTY_STRUCTURE);
    setLoadingDetail(true);
    Promise.all([
      apiRequest(`/v1/admin/schools/${encodeURIComponent(selectedId)}`),
      apiRequest(`/v1/schools/${encodeURIComponent(selectedId)}/grades`),
      apiRequest(`/v1/teachers?schoolId=${encodeURIComponent(selectedId)}`),
    ]).then(async ([school, grades, schoolTeachers]) => {
      const nested = await Promise.all(grades.map(async grade => ({
        ...grade,
        groups: await apiRequest(`/v1/grades/${encodeURIComponent(grade.id)}/groups`),
      })));
      if (!active) return;
      setSelectedSchool(school);
      setStructure(nested);
      setTeachers(schoolTeachers);
    }).catch(error => { if (active) setLoadError(error.message || 'We could not load this school.'); })
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [view, selectedId]);

  const schoolSaved = saved => {
    setSchools(current => current.some(school => school.id === saved.id)
      ? current.map(school => school.id === saved.id ? saved : school).sort((a, b) => a.name.localeCompare(b.name))
      : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(saved.id);
    setSelectedSchool(saved);
  };

  const completeSave = (saved, message) => {
    schoolSaved(saved);
    setSelectedId(null);
    setSelectedSchool(null);
    setView('list');
    setNotice(message);
  };

  const beginDelete = async school => {
    setDeleteTarget(school);
    setDeleteImpact(null);
    setDeleteError('');
    setLoadingImpact(true);
    try {
      const impact = await apiRequest(`/v1/admin/schools/${encodeURIComponent(school.id)}/delete-impact`);
      setDeleteImpact(impact);
    } catch (error) { setDeleteError(error.message); }
    finally { setLoadingImpact(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/v1/admin/schools/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      setSchools(current => current.filter(school => school.id !== deleteTarget.id));
      setNotice(`${deleteTarget.name} archived successfully.`);
      setDeleteTarget(null);
    } catch (error) { setDeleteError(error.message); }
    finally { setDeleting(false); }
  };

  if (view === 'create') return <SchoolForm mode="create" structure={EMPTY_STRUCTURE} teachers={[]} onCancel={() => setView('list')} onSchoolSaved={schoolSaved} onComplete={completeSave} onAddTeacher={onAddTeacher} />;
  if (view === 'edit') {
    if (loadError) return <section className="panel school-management-state" role="alert"><h1>School unavailable</h1><p>{loadError}</p><button type="button" className="button-secondary" onClick={() => { setLoadError(''); setView('list'); }}>Back to Schools</button></section>;
    if (loadingDetail || !selectedSchool) return <section className="panel school-management-state" role="status">Loading school and academic structure...</section>;
    return <SchoolForm key={selectedSchool.id} mode="edit" school={selectedSchool} structure={structure} teachers={teachers} onCancel={() => { setView('list'); setSelectedSchool(null); }} onSchoolSaved={schoolSaved} onComplete={completeSave} onAddTeacher={onAddTeacher} />;
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
            : <div className="school-list" aria-label="Registered schools">{schools.map(school => <article className="school-list-item" key={school.id}><div className="school-list-mark" aria-hidden="true">⌂</div><div className="school-list-details"><h2>{school.name}</h2><span>{school.timezone} · {school.locale}</span></div><button type="button" className="button-secondary" aria-label={`Edit ${school.name}`} onClick={() => { setNotice(''); setSelectedId(school.id); setLoadError(''); setView('edit'); }}>Edit</button><button type="button" className="danger-text-action" aria-label={`Delete ${school.name}`} onClick={() => beginDelete(school)}>Delete</button></article>)}</div>}
          {deleteTarget && <DeleteConfirmationDialog entityType="School" entityName={deleteTarget.name} impact={deleteImpact} loadingImpact={loadingImpact} deleting={deleting} error={deleteError} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    </section>
  );
}

export default SchoolManagement;
