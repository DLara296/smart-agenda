import React, { useEffect, useState } from 'react';
import GradeForm from './GradeForm';

function FamilyForm({ onCancel, onSuccess }) {
  const fallbackSchools = [
    { id: 'school-1', name: 'Westfield Elementary', detail: 'Westfield · Active' },
    { id: 'school-2', name: 'Northview Primary', detail: 'Northview · Active' },
    { id: 'school-3', name: 'Lakeside Academy', detail: 'Lakeside · Active' },
  ];
  const [registeredSchools, setRegisteredSchools] = useState(fallbackSchools);
  const [grades, setGrades] = useState([]);
  const [groups, setGroups] = useState([]);
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
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const [showNewSchoolForm, setShowNewSchoolForm] = useState(false);
  const [newRecordName, setNewRecordName] = useState('');
  const selectedSchool = registeredSchools.find(school => school.id === form.schoolId);
  const selectedGrade = grades.find(grade => grade.id === form.gradeId);
  const selectedGroup = groups.find(group => group.id === form.groupId);
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('family');

  const updateField = event => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  useEffect(() => {
    fetch('/v1/schools', { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => {
      if (payload.data?.length) setRegisteredSchools(payload.data);
    }).catch(() => {});
  }, []);

  if (view === 'grade') return <GradeForm schools={registeredSchools} initialSchoolId={form.schoolId} onCancel={() => setView('family')} onSuccess={created => { setGrades(previous => [...previous, created]); setForm(previous => ({ ...previous, gradeId: created.id })); setView('family'); }} />;

  const loadGrades = schoolId => {
    setForm(previous => ({ ...previous, schoolId, gradeId: '', groupId: '' }));
    setGrades([]); setGroups([]);
    fetch(`/v1/schools/${schoolId}/grades`, { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => setGrades(payload.data || [])).catch(() => {});
  };

  const loadGroups = gradeId => {
    setForm(previous => ({ ...previous, gradeId, groupId: '' }));
    setGroups([]);
    fetch(`/v1/grades/${gradeId}/groups`, { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(payload => setGroups(payload.data || [])).catch(() => {});
  };

  const createNewRecord = async () => {
    const type = showNewSchoolForm;
    const payload = type === true ? { name: newRecordName } : type === 'grade' ? { schoolId: form.schoolId, name: newRecordName } : { gradeId: form.gradeId, name: newRecordName, code: newRecordName.toUpperCase().replace(/\s+/g, '-') };
    const endpoint = type === true ? '/v1/schools' : type === 'grade' ? '/v1/grades' : '/v1/groups';
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' }, body: JSON.stringify(payload) });
    if (!response.ok) return;
    const created = await response.json();
    if (type === true) { setRegisteredSchools([...registeredSchools, created]); setForm(previous => ({ ...previous, schoolId: created.id })); }
    if (type === 'grade') { setGrades([...grades, created]); setForm(previous => ({ ...previous, gradeId: created.id })); }
    if (type === 'group') { setGroups([...groups, created]); setForm(previous => ({ ...previous, groupId: created.id })); }
    setNewRecordName(''); setShowNewSchoolForm(false);
  };

  const startNewRecord = type => {
    if (type === 'grade' && !form.schoolId) {
      setStatus({ type: 'error', message: 'Select a school before adding a grade.' });
      setSchoolMenuOpen(true);
      return;
    }
    if (type === 'grade') {
      setSchoolMenuOpen(false);
      setStatus(null);
      setView('grade');
      return;
    }
    if (type === 'group' && !form.gradeId) {
      setStatus({ type: 'error', message: 'Select a grade before adding a group.' });
      setSchoolMenuOpen('grades');
      return;
    }
    setSchoolMenuOpen(false);
    setShowNewSchoolForm(type);
    setStatus(null);
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
      if (onSuccess) onSuccess();
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
        <label htmlFor="school-selector">School</label>
        <div className="school-field">
          <button id="school-selector" type="button" className="school-field-trigger" aria-label="Select school" aria-expanded={schoolMenuOpen} onClick={() => setSchoolMenuOpen(!schoolMenuOpen)}>
            <span>{selectedSchool ? selectedSchool.name : 'Select a registered school'}</span><span aria-hidden="true">⌄</span>
          </button>
          {schoolMenuOpen === true && <div className="school-field-menu" role="listbox" aria-label="Registered schools">
            {registeredSchools.map(school => <button key={school.id} type="button" role="option" aria-selected={form.schoolId === school.id} onClick={() => { loadGrades(school.id); setSchoolMenuOpen(false); }}><strong>{school.name}</strong><small>{school.detail || `${school.locale || ''} · ${school.status}`}</small></button>)}
            <button type="button" className="add-school-option" onClick={() => { setSchoolMenuOpen(false); setShowNewSchoolForm(true); }}>＋ Add new school</button>
          </div>}
        </div>
        <input type="hidden" name="schoolId" value={form.schoolId} required />
        {showNewSchoolForm === true && <div className="new-school-inline"><label htmlFor="new-school-name">New school name</label><input id="new-school-name" value={newRecordName} onChange={event => setNewRecordName(event.target.value)} placeholder="Enter school name" autoFocus required /><button type="button" className="small-action" onClick={createNewRecord}>Save school</button></div>}
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
        <label htmlFor="grade-selector">Grade</label>
        <div className="school-field"><button id="grade-selector" type="button" className="school-field-trigger" aria-label="Select grade" disabled={!form.schoolId} onClick={() => setSchoolMenuOpen(schoolMenuOpen === 'grades' ? false : 'grades')}>{selectedGrade ? selectedGrade.name : 'Select a registered grade'}<span aria-hidden="true">⌄</span></button>{schoolMenuOpen === 'grades' && <div className="school-field-menu" role="listbox" aria-label="Registered grades">{grades.length === 0 && <p className="selector-empty">No grades registered for this school yet.</p>}{grades.map(grade => <button key={grade.id} type="button" role="option" aria-selected={form.gradeId === grade.id} onClick={() => { loadGroups(grade.id); setSchoolMenuOpen(false); }}><strong>{grade.name}</strong><small>{grade.academicPeriod || 'Active grade'}</small></button>)}<button type="button" className="add-school-option" onClick={() => startNewRecord('grade')}>＋ New Grade</button></div>}</div>
        <label htmlFor="group-selector">Group name</label>
        <div className="school-field"><button id="group-selector" type="button" className="school-field-trigger" aria-label="Select group" disabled={!form.gradeId} onClick={() => setSchoolMenuOpen(schoolMenuOpen === 'groups' ? false : 'groups')}>{selectedGroup ? selectedGroup.name : 'Select a registered group'}<span aria-hidden="true">⌄</span></button>{schoolMenuOpen === 'groups' && <div className="school-field-menu" role="listbox" aria-label="Registered groups">{groups.length === 0 && <p className="selector-empty">No groups registered for this grade yet.</p>}{groups.map(group => <button key={group.id} type="button" role="option" aria-selected={form.groupId === group.id} onClick={() => { setForm(previous => ({ ...previous, groupId: group.id })); setSchoolMenuOpen(false); }}><strong>{group.name}</strong><small>{group.code || 'Active group'}</small></button>)}<button type="button" className="add-school-option" onClick={() => startNewRecord('group')}>＋ Add new group name</button></div>}</div>
        {showNewSchoolForm && showNewSchoolForm !== true && <div className="new-school-inline"><label htmlFor="new-record-name">New {showNewSchoolForm} name</label><input id="new-record-name" value={newRecordName} onChange={event => setNewRecordName(event.target.value)} placeholder={`Enter ${showNewSchoolForm} name`} autoFocus required /><button type="button" className="small-action" onClick={createNewRecord}>Save {showNewSchoolForm}</button></div>}
        <input type="hidden" name="gradeId" value={form.gradeId} required /><input type="hidden" name="groupId" value={form.groupId} required />
      </fieldset>

      <p className="privacy-note" role="note">Family and child information is protected and visible only to authorized school coordinators and the household.</p>
      {status && <p className={`form-status ${status.type}`} role="status">{status.message}</p>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register'}</button>
    </form>
  );
}

export default FamilyForm;
