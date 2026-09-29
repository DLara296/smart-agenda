import React, { useEffect, useRef, useState } from 'react';
import GradeForm from './GradeForm';
import { AvatarPicker, DEFAULT_AVATARS } from './FamilyAvatar';

const FALLBACK_SCHOOLS = [
  { id: 'school-1', name: 'Westfield Elementary', detail: 'Westfield · Active' },
  { id: 'school-2', name: 'Northview Primary', detail: 'Northview · Active' },
  { id: 'school-3', name: 'Lakeside Academy', detail: 'Lakeside · Active' },
];
const HEADERS = { 'Content-Type': 'application/json', 'x-user-role': 'admin' };
const LANGUAGE_OPTIONS = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }];

function LanguageSelect({ id, value, onChange }) {
  const [open, setOpen] = useState(false);
  const summary = LANGUAGE_OPTIONS.filter(option => value.includes(option.code)).map(option => option.name).join(', ');
  const toggle = code => onChange(value.includes(code) ? value.filter(item => item !== code) : [...value, code]);
  return (
    <div className="school-field" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button id={id} type="button" className="school-field-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{summary || 'Select languages'}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="school-field-menu language-options" role="listbox" aria-multiselectable="true" aria-labelledby={id}>
          {LANGUAGE_OPTIONS.map(option => (
            <label key={option.code} role="option" aria-selected={value.includes(option.code)}>
              <input type="checkbox" checked={value.includes(option.code)} onChange={() => toggle(option.code)} />
              {option.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const readJson = (url, fallback) => fetch(url, { headers: HEADERS }).then(response => (response.ok ? response.json() : fallback)).catch(() => fallback);

function FamilyForm({ family = null, allowStructureChanges = false, adminEdit = false, onCancel, onSuccess }) {
  const isEdit = Boolean(family);
  const nextKey = useRef(0);
  const key = () => { nextKey.current += 1; return `row-${nextKey.current}`; };
  const toGuardian = (guardian = {}) => ({ key: key(), id: guardian.id, avatar: guardian.avatar || DEFAULT_AVATARS.guardian, name: guardian.name || '', email: guardian.email || '', phone: guardian.phone || '', relationship: guardian.relationship || '', supportedLanguages: (guardian.supportedLanguages || []).map(language => String(language).trim().toLowerCase()).filter(code => LANGUAGE_OPTIONS.some(option => option.code === code)) });
  const toChild = (child = {}) => ({ key: key(), id: child.id, avatar: child.avatar || DEFAULT_AVATARS.child, name: child.name || '', gradeId: child.gradeId || '', groupId: child.groupId || '' });

  const [schools, setSchools] = useState(FALLBACK_SCHOOLS);
  const [grades, setGrades] = useState([]);
  const [groupsByGrade, setGroupsByGrade] = useState({});
  const [displayName, setDisplayName] = useState(family?.displayName || '');
  const [familyAvatar, setFamilyAvatar] = useState(family?.avatar || DEFAULT_AVATARS.household);
  const [schoolId, setSchoolId] = useState(family?.schoolId || '');
  const [guardians, setGuardians] = useState(() => (family?.guardians?.length ? family.guardians.map(toGuardian) : [toGuardian()]));
  const [children, setChildren] = useState(() => (family?.children?.length ? family.children.map(toChild) : [toChild()]));
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const [newSchoolOpen, setNewSchoolOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newGroup, setNewGroup] = useState({ childKey: null, name: '' });
  const [gradeFormFor, setGradeFormFor] = useState(null);
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedSchool = schools.find(school => school.id === schoolId);

  const loadGroups = gradeId => {
    if (!gradeId || groupsByGrade[gradeId]) return;
    readJson(`/v1/grades/${gradeId}/groups`, {}).then(payload => setGroupsByGrade(previous => ({ ...previous, [gradeId]: payload.data || [] })));
  };

  useEffect(() => {
    readJson('/v1/schools', {}).then(payload => { if (payload.data?.length) setSchools(payload.data); });
    if (family?.schoolId) readJson(`/v1/schools/${family.schoolId}/grades`, {}).then(payload => setGrades(payload.data || []));
    (family?.children || []).forEach(child => loadGroups(child.gradeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSchool = id => {
    setSchoolId(id);
    setSchoolMenuOpen(false);
    setGrades([]);
    setChildren(previous => previous.map(child => ({ ...child, gradeId: '', groupId: '' })));
    readJson(`/v1/schools/${id}/grades`, {}).then(payload => setGrades(payload.data || []));
  };

  const updateGuardian = (rowKey, field, value) => setGuardians(previous => previous.map(guardian => (guardian.key === rowKey ? { ...guardian, [field]: value } : guardian)));
  const updateChild = (rowKey, changes) => setChildren(previous => previous.map(child => (child.key === rowKey ? { ...child, ...changes } : child)));
  const selectGrade = (rowKey, gradeId) => { updateChild(rowKey, { gradeId, groupId: '' }); loadGroups(gradeId); };

  const createSchool = async () => {
    const response = await fetch('/v1/schools', { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: newSchoolName }) });
    if (!response.ok) { setStatus({ type: 'error', message: 'The school could not be created.' }); return; }
    const created = await response.json();
    setSchools(previous => [...previous, created]);
    selectSchool(created.id);
    setNewSchoolName('');
    setNewSchoolOpen(false);
  };

  const createGroup = async child => {
    const name = newGroup.name.trim();
    if (!name) return;
    const response = await fetch('/v1/groups', { method: 'POST', headers: HEADERS, body: JSON.stringify({ gradeId: child.gradeId, name, code: name.toUpperCase().replace(/\s+/g, '-') }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus({ type: 'error', message: payload.error?.message || 'The group could not be created.' }); return; }
    setGroupsByGrade(previous => ({ ...previous, [child.gradeId]: [...(previous[child.gradeId] || []), payload] }));
    updateChild(child.key, { groupId: payload.id });
    setNewGroup({ childKey: null, name: '' });
  };

  const submit = async event => {
    event.preventDefault();
    setStatus(null);
    if (!schoolId) { setStatus({ type: 'error', message: 'Select a school for the family.' }); return; }
    if (children.some(child => !child.gradeId || !child.groupId)) { setStatus({ type: 'error', message: 'Select a grade and group for every child.' }); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(isEdit ? (adminEdit ? `/v1/admin/families/${family.id}` : '/v1/families/me') : '/v1/families', {
        method: isEdit ? (adminEdit ? 'PATCH' : 'PUT') : 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          displayName,
          schoolId,
          avatar: familyAvatar,
          guardians: guardians.map(guardian => ({
            id: guardian.id,
            avatar: guardian.avatar,
            name: guardian.name,
            email: guardian.email,
            phone: guardian.phone,
            relationship: guardian.relationship,
            supportedLanguages: guardian.supportedLanguages,
          })),
          children: children.map(({ id, avatar, name, gradeId, groupId }) => ({ id, avatar, name, gradeId, groupId })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'The family could not be saved.');
      setStatus({ type: 'success', message: isEdit ? 'Family updated successfully.' : 'Family registered successfully.' });
      if (onSuccess) onSuccess(payload.data || payload);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'The family could not be saved.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (allowStructureChanges && gradeFormFor) {
    return <GradeForm schools={schools} initialSchoolId={schoolId} onCancel={() => setGradeFormFor(null)} onSuccess={created => { setGrades(previous => [...previous, created]); selectGrade(gradeFormFor, created.id); setGradeFormFor(null); }} />;
  }

  return (
    <form className="family-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="app-eyebrow">Protected household record</p>
          <h2>{isEdit ? 'Edit Family' : 'Register Family'}</h2>
        </div>
        <button type="button" className="button-secondary" onClick={onCancel}>Back</button>
      </div>

      <fieldset>
        <legend>Household</legend>
        <AvatarPicker id="household-avatar" label="Household avatar" kind="household" name={displayName} value={familyAvatar} onChange={setFamilyAvatar} />
        <label htmlFor="displayName">Family name</label>
        <input id="displayName" name="displayName" value={displayName} onChange={event => setDisplayName(event.target.value)} required />
        <label htmlFor="school-selector">School</label>
        <div className="school-field">
          <button id="school-selector" type="button" className="school-field-trigger" aria-label="Select school" aria-expanded={schoolMenuOpen} onClick={() => setSchoolMenuOpen(!schoolMenuOpen)}>
            <span>{selectedSchool ? selectedSchool.name : 'Select a registered school'}</span><span aria-hidden="true">⌄</span>
          </button>
          {schoolMenuOpen && <div className="school-field-menu" role="listbox" aria-label="Registered schools">
            {schools.map(school => <button key={school.id} type="button" role="option" aria-selected={schoolId === school.id} onClick={() => selectSchool(school.id)}><strong>{school.name}</strong><small>{school.detail || `${school.locale || ''} · ${school.status || 'active'}`}</small></button>)}
            <button type="button" className="add-school-option" onClick={() => { setSchoolMenuOpen(false); setNewSchoolOpen(true); }}>＋ Add new school</button>
          </div>}
        </div>
        {newSchoolOpen && <div className="new-school-inline"><label htmlFor="new-school-name">New school name</label><input id="new-school-name" value={newSchoolName} onChange={event => setNewSchoolName(event.target.value)} placeholder="Enter school name" autoFocus /><button type="button" className="small-action" onClick={createSchool}>Save school</button></div>}
      </fieldset>

      <fieldset>
        <legend>Guardians and relatives</legend>
        {guardians.map((guardian, index) => (
          <div className="family-member" key={guardian.key}>
            <div className="family-member-heading">
              <strong>{index === 0 ? 'Primary guardian' : `Guardian or relative ${index + 1}`}</strong>
              {guardians.length > 1 && <button type="button" className="text-action" aria-label={`Remove guardian ${index + 1}`} onClick={() => setGuardians(previous => previous.filter(item => item.key !== guardian.key))}>Remove</button>}
            </div>
            <AvatarPicker id={`guardian-avatar-${guardian.key}`} label="Guardian avatar" kind="guardian" name={guardian.name} value={guardian.avatar} onChange={avatar => updateGuardian(guardian.key, 'avatar', avatar)} />
            <label htmlFor={`guardian-name-${guardian.key}`}>Full name</label>
            <input id={`guardian-name-${guardian.key}`} value={guardian.name} onChange={event => updateGuardian(guardian.key, 'name', event.target.value)} required />
            <label htmlFor={`guardian-email-${guardian.key}`}>Email{index > 0 && <small> (optional)</small>}</label>
            <input id={`guardian-email-${guardian.key}`} type="email" value={guardian.email} onChange={event => updateGuardian(guardian.key, 'email', event.target.value)} required={index === 0} />
            <label htmlFor={`guardian-phone-${guardian.key}`}>Phone <small>(optional, for SMS or WhatsApp)</small></label>
            <input id={`guardian-phone-${guardian.key}`} type="tel" autoComplete="tel" value={guardian.phone} onChange={event => updateGuardian(guardian.key, 'phone', event.target.value)} />
            <label htmlFor={`guardian-relationship-${guardian.key}`}>Relationship</label>
            <input id={`guardian-relationship-${guardian.key}`} placeholder="Parent, grandparent, aunt..." value={guardian.relationship} onChange={event => updateGuardian(guardian.key, 'relationship', event.target.value)} required />
            <label htmlFor={`guardian-languages-${guardian.key}`}>Languages <small>(optional)</small></label>
            <LanguageSelect id={`guardian-languages-${guardian.key}`} value={guardian.supportedLanguages} onChange={languages => updateGuardian(guardian.key, 'supportedLanguages', languages)} />
          </div>
        ))}
        <button type="button" className="button-secondary add-member" onClick={() => setGuardians(previous => [...previous, toGuardian()])}>＋ Add guardian or relative</button>
      </fieldset>

      <fieldset>
        <legend>Children</legend>
        {children.map((child, index) => {
          const groups = groupsByGrade[child.gradeId] || [];
          return (
            <div className="family-member" key={child.key}>
              <div className="family-member-heading">
                <strong>{`Child ${index + 1}`}</strong>
                {children.length > 1 && <button type="button" className="text-action" aria-label={`Remove child ${index + 1}`} onClick={() => setChildren(previous => previous.filter(item => item.key !== child.key))}>Remove</button>}
              </div>
              <AvatarPicker id={`child-avatar-${child.key}`} label="Child avatar" kind="child" name={child.name} value={child.avatar} onChange={avatar => updateChild(child.key, { avatar })} />
              <label htmlFor={`child-name-${child.key}`}>Full name</label>
              <input id={`child-name-${child.key}`} value={child.name} onChange={event => updateChild(child.key, { name: event.target.value })} required />
              <label htmlFor={`child-grade-${child.key}`}>Grade</label>
              <div className="inline-select">
                <select id={`child-grade-${child.key}`} value={child.gradeId} disabled={!schoolId} onChange={event => selectGrade(child.key, event.target.value)} required>
                  <option value="">{schoolId ? 'Select a registered grade' : 'Select a school first'}</option>
                  {grades.map(grade => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                </select>
                {allowStructureChanges && <button type="button" className="button-secondary" disabled={!schoolId} onClick={() => setGradeFormFor(child.key)}>＋ New grade</button>}
              </div>
              <label htmlFor={`child-group-${child.key}`}>Group name</label>
              <div className="inline-select">
                <select id={`child-group-${child.key}`} value={child.groupId} disabled={!child.gradeId} onChange={event => updateChild(child.key, { groupId: event.target.value })} required>
                  <option value="">{child.gradeId ? (groups.length ? 'Select a registered group' : 'No groups registered for this grade yet') : 'Select a grade first'}</option>
                  {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
                {allowStructureChanges && <button type="button" className="button-secondary" disabled={!child.gradeId} onClick={() => setNewGroup({ childKey: child.key, name: '' })}>＋ New group</button>}
              </div>
              {allowStructureChanges && newGroup.childKey === child.key && <div className="new-school-inline"><label htmlFor={`new-group-${child.key}`}>New group name</label><input id={`new-group-${child.key}`} value={newGroup.name} onChange={event => setNewGroup({ childKey: child.key, name: event.target.value })} placeholder="Enter group name" autoFocus /><button type="button" className="small-action" onClick={() => createGroup(child)}>Save group</button></div>}
            </div>
          );
        })}
        <button type="button" className="button-secondary add-member" onClick={() => setChildren(previous => [...previous, toChild()])}>＋ Add child</button>
      </fieldset>

      <p className="privacy-note" role="note">Family and child information is protected and visible only to authorized school coordinators and the household.</p>
      {status && <p className={`form-status ${status.type}`} role="status">{status.message}</p>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Register'}</button>
    </form>
  );
}

export default FamilyForm;
