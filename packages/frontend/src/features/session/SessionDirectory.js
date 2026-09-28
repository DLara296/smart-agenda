import React, { useEffect, useState } from 'react';
import { usePreferences } from '../settings/PreferencesContext';

function SessionDirectory({ onNew, onEdit }) {
  const { formatDate, formatTime } = usePreferences();
  const [sessions, setSessions] = useState([]);
  useEffect(() => { fetch('/v1/sessions', { headers: { 'x-user-role': 'admin' } }).then(response => response.json()).then(data => setSessions(Array.isArray(data) ? data : [])).catch(() => setSessions([])); }, []);
  return <section className="panel directory-panel" aria-label="Reading Sessions"><div className="panel-heading compact"><div><span className="section-kicker">Operations</span><h1>Reading Sessions</h1></div><button className="primary-action" onClick={onNew}>＋ New session</button></div>{sessions.length === 0 ? <div className="empty-state"><span className="empty-icon">◷</span><strong>No reading sessions registered yet</strong><p>Create a reading session to start coordinating coverage.</p><button className="small-action" onClick={onNew}>Create session</button></div> : sessions.map(session => <div className="directory-row" key={session.id}><img className="session-thumb" src={session.image || '/assets/session-default.svg'} alt="" /><span className="date-chip">{formatDate(session.sessionDate)}</span><div><strong>{session.gradeId || 'Reading session'}</strong><span>{formatTime(session.startTime)} · {session.status} · {session.coverage?.warningCount || 0} groups need attention</span></div><button className="small-action row-action" onClick={() => onEdit(session)}>Edit</button></div>)}</section>;
}
export default SessionDirectory;
