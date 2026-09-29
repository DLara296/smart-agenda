import React, { useCallback, useEffect, useState } from 'react';
import { usePreferences } from '../settings/PreferencesContext';

const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];
const LOAD_ERROR = "We couldn't load the reading sessions. Please try again.";

const label = value => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function categorize(sessions) {
  const today = todayKey();
  return [
    ['Upcoming sessions', sessions.filter(session => session.status !== 'cancelled' && session.sessionDate >= today)],
    ['Past sessions', sessions.filter(session => session.status !== 'cancelled' && session.sessionDate < today)],
    ['Cancelled sessions', sessions.filter(session => session.status === 'cancelled')],
  ].filter(([, items]) => items.length > 0);
}

function HistorySessionCard({ session }) {
  const { formatDate, formatTime } = usePreferences();
  const [open, setOpen] = useState(false);
  const groupNames = session.groups.map(group => group.groupName).filter(Boolean).join(', ');
  return (
    <article className="history-card">
      <div className="history-card-top">
        <div>
          <strong>{formatDate(session.sessionDate)} · {formatTime(session.startTime)}</strong>
          <span>{[session.gradeName, groupNames].filter(Boolean).join(' · ') || 'Reading session'}</span>
        </div>
        <span className={`status-badge history-status ${session.status}`}>{label(session.status)}</span>
      </div>
      {session.relatedChildren.length > 0 && <p className="history-children">Child: {session.relatedChildren.map(child => child.name).join(', ')}</p>}
      <button type="button" className="text-action" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'View details'}</button>
      {open && (
        <dl className="history-details">
          <div><dt>School</dt><dd>{session.schoolName || '—'}</dd></div>
          <div><dt>Time</dt><dd>{formatTime(session.startTime)}{session.endTime && session.endTime !== session.startTime ? ` – ${formatTime(session.endTime)}` : ''}</dd></div>
          {session.groups.length === 0 && <div><dt>Groups</dt><dd>No groups assigned yet</dd></div>}
          {session.groups.map(group => (
            <div key={group.groupId}>
              <dt>{group.groupName || 'Group'}</dt>
              <dd>Teacher: {group.teacherName || '—'} · Language: {group.language || '—'} · Reader: {group.reader || 'Not assigned'}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

function HistoryView({ initialView = 'all' }) {
  const [filters, setFilters] = useState({ view: initialView, gradeId: '', groupId: '', status: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.view.startsWith('child:')) {
      params.set('view', 'child');
      params.set('childId', filters.view.slice('child:'.length));
    } else {
      params.set('view', filters.view);
    }
    if (filters.gradeId) params.set('gradeId', filters.gradeId);
    if (filters.groupId) params.set('groupId', filters.groupId);
    if (filters.status) params.set('status', filters.status);
    setLoading(true);
    setError(null);
    fetch(`/v1/history/sessions?${params.toString()}`, { credentials: 'include' })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(LOAD_ERROR))))
      .then(payload => setData(payload.data))
      .catch(() => setError(LOAD_ERROR))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const update = event => {
    const { name, value } = event.target;
    // A group belongs to one grade, so changing the grade clears the group selection.
    setFilters(previous => ({ ...previous, [name]: value, ...(name === 'gradeId' ? { groupId: '' } : {}) }));
  };
  const children = data?.children || [];
  const grades = data?.grades || [];
  const groups = (data?.groups || []).filter(group => !filters.gradeId || group.gradeId === filters.gradeId);
  const sessions = data?.sessions || [];
  const noChildren = data && children.length === 0;

  return (
    <section className="panel history-view" aria-label="History">
      <div className="panel-heading compact"><div><span className="section-kicker">Read-only</span><h1>History</h1></div></div>
      {!noChildren && (
        <div className="history-filters">
          <div>
            <label htmlFor="history-view">View</label>
            <select id="history-view" name="view" value={filters.view} onChange={update}>
              <option value="all">All Grade Sessions</option>
              <option value="children">My Children</option>
              {children.length > 0 && (
                <optgroup label="Child">
                  {children.map(child => <option key={child.id} value={`child:${child.id}`}>{child.name} — {[child.gradeName, child.groupName].filter(Boolean).join(' · ')}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="history-grade">Grade</label>
            <select id="history-grade" name="gradeId" value={filters.gradeId} onChange={update}>
              <option value="">All Grades</option>
              {grades.map(grade => <option key={grade.id} value={grade.id}>{grade.name || 'Grade'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="history-group">Group</label>
            <select id="history-group" name="groupId" value={filters.groupId} onChange={update}>
              <option value="">All Groups</option>
              {groups.map(group => <option key={group.id} value={group.id}>{filters.gradeId ? group.name : [group.gradeName, group.name].filter(Boolean).join(' · ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="history-status">Status</label>
            <select id="history-status" name="status" value={filters.status} onChange={update}>
              <option value="">All Statuses</option>
              {STATUSES.map(status => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading && <p className="history-loading" role="status">Loading reading sessions...</p>}
      {!loading && error && (
        <div className="form-status error history-error" role="alert">
          <span>{error}</span>
          <button type="button" className="small-action" onClick={load}>Try again</button>
        </div>
      )}
      {!loading && !error && noChildren && (
        <div className="empty-state"><span className="empty-icon">⌂</span><strong>No registered children yet</strong><p>Register your family's children to see the reading sessions for their grades.</p></div>
      )}
      {!loading && !error && !noChildren && sessions.length === 0 && (
        <div className="empty-state"><span className="empty-icon">◷</span><strong>No reading sessions found for this selection.</strong></div>
      )}
      {!loading && !error && sessions.length > 0 && categorize(sessions).map(([title, items]) => (
        <div className="history-group" key={title}>
          <h2>{title}</h2>
          {items.map(session => <HistorySessionCard key={session.id} session={session} />)}
        </div>
      ))}
    </section>
  );
}

export default HistoryView;
