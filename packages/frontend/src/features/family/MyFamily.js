import React, { useEffect, useState } from 'react';

function MyFamily({ onRegister }) {
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
      <div className="panel-heading compact"><div><span className="section-kicker">Household</span><h2>My Family</h2></div></div>
      {error && <p className="form-status error" role="alert">{error}</p>}
      {!error && family === undefined && <p className="history-loading" role="status">Loading your family...</p>}
      {!error && family === null && (
        <div className="empty-state"><span className="empty-icon">⌂</span><strong>No family registered yet</strong><p>Register your household to connect guardians and children to the reading program. Each account can register one family.</p><button className="small-action" onClick={onRegister}>Register my family</button></div>
      )}
      {!error && family && (
        <>
          <div className="directory-row"><span className="avatar">{family.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{family.displayName}</strong><span>{family.guardians.length} guardians · {family.children.length} children</span></div></div>
          {family.guardians.map(guardian => <div className="directory-row" key={guardian.id}><span className="avatar">{guardian.name.slice(0, 2).toUpperCase()}</span><div><strong>{guardian.name}</strong><span>Guardian{guardian.relationship ? ` · ${guardian.relationship}` : ''}</span></div></div>)}
          {family.children.map(child => <div className="directory-row" key={child.id}><span className="avatar">{child.name.slice(0, 2).toUpperCase()}</span><div><strong>{child.name}</strong><span>{['Child', child.gradeName, child.groupName].filter(Boolean).join(' · ')}</span></div></div>)}
        </>
      )}
    </section>
  );
}

export default MyFamily;
