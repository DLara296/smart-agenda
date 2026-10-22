import React, { useEffect, useState } from 'react';
import { usePreferences } from '../settings/PreferencesContext';
import AddToCalendar from '../calendarExport/AddToCalendar';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';

function SessionDirectory({ onNew, onEdit, canManage = false }) {
  const { formatDate, formatTime } = usePreferences();
  const [sessions, setSessions] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => fetch('/v1/sessions', { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(data => setSessions((Array.isArray(data) ? data : []).filter(session => session.status !== 'cancelled'))).catch(() => setSessions([]));
  useEffect(() => { load(); }, []);
  const confirmDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/v1/sessions/${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'We could not delete this reading session.');
      setDeleteTarget(null);
      setNotice('Reading session cancelled.');
      load();
    } catch (deleteError) { setError(deleteError.message); }
    finally { setDeleting(false); }
  };
  return <section className="panel directory-panel" aria-label="Reading Sessions"><div className="panel-heading compact"><div><span className="section-kicker">Operations</span><h1>Reading Sessions</h1></div><button className="primary-action" onClick={onNew}>＋ New session</button></div>{notice && <p className="form-status success" role="status">{notice}</p>}{sessions.length === 0 ? <div className="empty-state"><span className="empty-icon">◷</span><strong>No reading sessions registered yet</strong><p>Create a reading session to start coordinating coverage.</p><button className="small-action" onClick={onNew}>Create session</button></div> : sessions.map(session => <div className="directory-row" key={session.id}><img className="session-thumb" src={session.image || '/assets/session-default.svg'} alt="" /><span className="date-chip">{formatDate(session.sessionDate)}</span><div><strong>{session.gradeName || session.gradeId || 'Reading session'}</strong><span>{formatTime(session.startTime)} · {session.status} · {session.coverage?.warningCount || 0} groups need attention</span></div><div className="row-actions"><AddToCalendar session={session} compact /><button className="small-action row-action" onClick={() => onEdit(session)}>Edit</button>{canManage && <button type="button" className="danger-text-action" aria-label={`Delete reading session ${formatDate(session.sessionDate)}`} onClick={() => { setDeleteTarget(session); setError(''); }}>Delete</button>}</div></div>)}{deleteTarget && <DeleteConfirmationDialog entityType="Reading Session" entityName={`${deleteTarget.gradeName || 'Reading session'} · ${formatDate(deleteTarget.sessionDate)}`} deleting={deleting} error={error} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}</section>;
}
export default SessionDirectory;
