import React, { useEffect, useState } from 'react';
import { FamilyAvatar } from './FamilyAvatar';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';

function FamilyDirectory({ families: initialFamilies = [], onRegister, onEdit }) {
  const [families, setFamilies] = useState(initialFamilies);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [impact, setImpact] = useState(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => fetch('/v1/families', { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(data => setFamilies(Array.isArray(data) ? data : [])).catch(() => setFamilies([]));
  useEffect(() => { load(); }, []);
  const beginDelete = async family => {
    setDeleteTarget(family);
    setImpact(null);
    setDeleteError('');
    setLoadingImpact(true);
    try {
      const response = await fetch(`/v1/admin/families/${family.id}/delete-impact`, { headers: { 'x-user-role': 'admin' } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to load family impact.');
      setImpact(payload.data);
    } catch (error) { setDeleteError(error.message); }
    finally { setLoadingImpact(false); }
  };
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/v1/admin/families/${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'We could not delete this family.');
      setDeleteTarget(null);
      setNotice(`${deleteTarget.displayName} archived successfully.`);
      load();
    } catch (error) { setDeleteError(error.message); }
    finally { setDeleting(false); }
  };
  return (
    <section className="panel directory-panel" aria-label="Families">
      <div className="panel-heading compact"><div><span className="section-kicker">People</span><h2>Families</h2></div><button className="primary-action" onClick={onRegister}>＋ Register family</button></div>
      {notice && <p className="form-status success" role="status">{notice}</p>}
      {families.length === 0 && <div className="empty-state"><span className="empty-icon">⌂</span><strong>No families registered yet</strong><p>Register a household to connect guardians and children to the reading program.</p><button className="small-action" onClick={onRegister}>Register first family</button></div>}
      {families.length > 0 && families.map(family => <div className="directory-row family-admin-row" key={`${family.id}-actions`}><FamilyAvatar value={family.avatar} kind="household" name={family.displayName} /><div><strong>{family.displayName}</strong><span>{family.guardianCount} guardians · {family.childCount} children</span></div><button type="button" className="button-secondary" aria-label={`Edit ${family.displayName}`} onClick={() => onEdit(family)}>Edit</button><button type="button" className="danger-text-action" aria-label={`Delete ${family.displayName}`} onClick={() => beginDelete(family)}>Delete</button></div>)}
      {deleteTarget && <DeleteConfirmationDialog entityType="Family" entityName={deleteTarget.displayName} impact={impact} loadingImpact={loadingImpact} deleting={deleting} error={deleteError} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    </section>
  );
}
export default FamilyDirectory;
