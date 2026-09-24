import React from 'react';

function FamilyDirectory({ families = [], onRegister }) {
  return (
    <section className="panel directory-panel" aria-label="Families">
      <div className="panel-heading compact"><div><span className="section-kicker">People</span><h2>Families</h2></div><button className="primary-action" onClick={onRegister}>＋ Register family</button></div>
      {families.length === 0 ? <div className="empty-state"><span className="empty-icon">⌂</span><strong>No families registered yet</strong><p>Register a household to connect guardians and children to the reading program.</p><button className="small-action" onClick={onRegister}>Register first family</button></div> : families.map(family => <div className="directory-row" key={family.id}><span className="avatar">{family.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{family.displayName}</strong><span>{family.guardianCount} guardians · {family.childCount} children</span></div></div>)}
    </section>
  );
}
export default FamilyDirectory;
