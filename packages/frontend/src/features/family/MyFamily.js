import React, { useEffect, useState } from 'react';
import { FamilyAvatar } from './FamilyAvatar';

function MyFamily({ onRegister, onEdit }) {
  const [family, setFamily] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/v1/families/me', { credentials: 'include' })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('Unable to load your family.'))))
      .then(payload => setFamily(payload.data || null))
      .catch(loadError => setError(loadError.message));
  }, []);

  return (
    <section className="panel directory-panel" aria-label="My Family">
      <div className="panel-heading compact"><div><span className="section-kicker">Household</span><h2>My Family</h2></div>{family && onEdit && <button className="primary-action" onClick={() => onEdit(family)}>✎ Edit family</button>}</div>
      {error && <p className="form-status error" role="alert">{error}</p>}
      {!error && family === undefined && <p className="history-loading" role="status">Loading your family...</p>}
      {!error && family === null && (
        <div className="empty-state"><span className="empty-icon">⌂</span><strong>No family registered yet</strong><p>Register your household to connect guardians and children to the reading program. Each account can register one family.</p><button className="small-action" onClick={onRegister}>Register my family</button></div>
      )}
      {!error && family && (
        <>
          <div className="directory-row"><FamilyAvatar value={family.avatar} kind="household" name={family.displayName} /><div><strong>{family.displayName}</strong><span>{family.guardians.length} guardians · {family.children.length} children</span></div></div>
          {family.guardians.map(guardian => <div className="directory-row" key={guardian.id}><FamilyAvatar value={guardian.avatar} kind="guardian" name={guardian.name} /><div><strong>{guardian.name}</strong><span>Guardian{guardian.relationship ? ` · ${guardian.relationship}` : ''}</span></div></div>)}
          {family.children.map(child => <div className="directory-row" key={child.id}><FamilyAvatar value={child.avatar} kind="child" name={child.name} /><div><strong>{child.name}</strong><span>{['Child', child.gradeName, child.groupName].filter(Boolean).join(' · ')}</span></div></div>)}
        </>
      )}
    </section>
  );
}

export default MyFamily;
