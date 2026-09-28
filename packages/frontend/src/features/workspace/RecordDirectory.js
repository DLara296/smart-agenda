import React, { useEffect, useState } from 'react';
import GradeForm from '../family/GradeForm';
import { usePreferences } from '../settings/PreferencesContext';

const config = {
  Teachers: { endpoint: '/v1/teachers', title: 'Teachers', fields: [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone']] },
  Students: { endpoint: '/v1/students', title: 'Students', fields: [['name', 'Name'], ['familyId', 'Family ID']] },
  'Reading Sessions': { endpoint: '/v1/sessions', title: 'Reading Sessions', fields: [] },
};

function RecordDirectory({ type, onCreate }) {
  const settings = config[type] || config.Teachers;
  const { formatDate } = usePreferences();
  const [records, setRecords] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState(null);
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [groups, setGroups] = useState([]);
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [gradeViewOpen, setGradeViewOpen] = useState(false);

  const load = () => fetch(settings.endpoint, { headers: { 'x-user-role': 'admin' } })
    .then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || `Unable to load ${settings.title.toLowerCase()}.`);
      const list = Array.isArray(payload) ? payload : payload.data;
      setRecords(Array.isArray(list) ? list : []);
    })
    .catch(loadError => { setRecords([]); setStatus(loadError.message); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [settings.endpoint]);
  useEffect(() => {
    if (type !== 'Teachers' && type !== 'Students') return;
    fetch('/v1/schools', { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => setSchools(payload.data || [])).catch(() => setSchools([]));
  }, [type]);

  const selectSchool = schoolId => {
    setForm(previous => ({ ...previous, schoolId, gradeId: '', groupId: '' }));
    setGrades([]);
    setGroups([]);
    if (!schoolId || type !== 'Students') return;
    fetch(`/v1/schools/${schoolId}/grades`, { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => setGrades(payload.data || [])).catch(() => setGrades([]));
  };

  const selectGrade = gradeId => {
    setForm(previous => ({ ...previous, gradeId, groupId: '' }));
    setGroups([]);
    if (!gradeId) return;
    fetch(`/v1/grades/${gradeId}/groups`, { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => setGroups(payload.data || [])).catch(() => setGroups([]));
  };

  const submit = async event => {
    event.preventDefault();
    if (type === 'Teachers' && !form.schoolId) {
      setStatus('Select a school before saving the teacher.');
      return;
    }
    if (type === 'Students' && (!form.schoolId || !form.gradeId || !form.groupId)) {
      setStatus('Select a school, grade, and group before saving the student.');
      return;
    }
    const response = await fetch(settings.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' }, body: JSON.stringify(form) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setStatus(payload.error?.message || 'Unable to save this record.'); return; }
    setStatus(`${settings.title.slice(0, -1)} added successfully.`); setForm({}); setAdding(false); load(); if (onCreate) onCreate();
  };

  if (gradeViewOpen) return <GradeForm schools={schools} initialSchoolId={form.schoolId} onCancel={() => setGradeViewOpen(false)} onSuccess={created => { setGrades(previous => [...previous, created]); setForm(previous => ({ ...previous, gradeId: created.id, groupId: '' })); setGradeViewOpen(false); setGradeMenuOpen(false); }} />;

  return <section className="panel directory-panel" aria-label={settings.title}>
    <div className="panel-heading compact"><div><span className="section-kicker">Manage</span><h1>{settings.title}</h1></div><button className="primary-action" onClick={() => setAdding(!adding)}>＋ Add {settings.title.slice(0, -1)}</button></div>
    {adding && <form className="inline-record-form" data-testid={`add-${type}-form`} onSubmit={submit}>
      {(type === 'Teachers' || type === 'Students') && <div><label htmlFor={`${type}-schoolId`}>School</label><select id={`${type}-schoolId`} value={form.schoolId || ''} onChange={event => selectSchool(event.target.value)} required><option value="">Select a school</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div>}
      {type === 'Students' && <div><label htmlFor="Students-gradeId">Grade</label><div className="school-field"><button id="Students-gradeId" type="button" className="school-field-trigger" aria-label="Grade" aria-expanded={gradeMenuOpen} disabled={!form.schoolId} onClick={() => setGradeMenuOpen(!gradeMenuOpen)}>{form.gradeId ? grades.find(grade => grade.id === form.gradeId)?.name : (form.schoolId ? 'Select a grade' : 'Select a school first')}<span aria-hidden="true">⌄</span></button>{gradeMenuOpen && <div className="school-field-menu" role="listbox" aria-label="Available grades">{grades.length === 0 && <p className="selector-empty">No grades registered for this school yet.</p>}{grades.map(grade => <button key={grade.id} type="button" role="option" aria-selected={form.gradeId === grade.id} onClick={() => { selectGrade(grade.id); setGradeMenuOpen(false); }}><strong>{grade.name}</strong><small>{grade.academicPeriod || 'Active grade'}</small></button>)}<button type="button" className="add-school-option" onClick={() => { if (!form.schoolId) { setStatus('Select a school before adding a grade.'); return; } setGradeMenuOpen(false); setGradeViewOpen(true); }}>＋ New Grade</button></div>}</div></div>}
      {type === 'Students' && <div><label htmlFor="Students-groupId">Group</label><select id="Students-groupId" value={form.groupId || ''} onChange={event => setForm({ ...form, groupId: event.target.value })} disabled={!form.gradeId} required><option value="">{form.gradeId ? 'Select a group' : 'Select a grade first'}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>}
      {settings.fields.map(([name, label]) => <div key={name}><label htmlFor={`${type}-${name}`}>{label}</label><input id={`${type}-${name}`} value={form[name] || ''} onChange={event => setForm({ ...form, [name]: event.target.value })} required /></div>)}
      <button type="submit" disabled={(type === 'Teachers' && !form.schoolId) || (type === 'Students' && (!form.schoolId || !form.gradeId || !form.groupId))}>Save</button>
    </form>}
    {status && <p className={`form-status ${status.includes('successfully') ? 'success' : 'error'}`} role={status.includes('successfully') ? 'status' : 'alert'}>{status}</p>}
    {records.length === 0 ? <div className="empty-state"><span className="empty-icon">◉</span><strong>No {settings.title.toLowerCase()} registered yet</strong><p>Add the first record to start coordinating SmartAgenda.</p></div> : records.map(record => <div className="directory-row" key={record.id}><span className="avatar">{(record.name || record.displayName || 'SA').slice(0, 2).toUpperCase()}</span><div><strong>{record.name || record.displayName || formatDate(record.sessionDate)}</strong><span>{record.email || record.status || 'Active'}</span></div></div>)}
  </section>;
}

export default RecordDirectory;
