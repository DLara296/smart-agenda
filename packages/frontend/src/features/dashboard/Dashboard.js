import React from 'react';
import { usePreferences } from '../settings/PreferencesContext';
import AddToCalendar from '../calendarExport/AddToCalendar';

const groups = [
  { name: 'Group A', language: 'Spanish', teacher: 'Miss Mariela', reader: 'Maria Gonzalez', book: 'The Very Hungry Caterpillar', status: 'Confirmed', tone: 'success' },
  { name: 'Group B', language: 'English', teacher: 'Miss Paola', reader: 'Not assigned', book: 'The Very Hungry Caterpillar', status: 'Volunteer needed', tone: 'warning' },
];

function StatusBadge({ children, tone = 'neutral' }) {
  return <span className={`status-badge ${tone}`}><span aria-hidden="true">{tone === 'success' ? '✓' : tone === 'warning' ? '!' : '•'}</span>{children}</span>;
}

function StatCard({ icon, label, value, context, tone }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{context}</small></div></article>;
}

function AttentionItem({ icon, children, action, onAction }) {
  return <li className="attention-item"><span className="attention-icon">{icon}</span><span>{children}</span><button className="text-action" onClick={onAction}>{action}</button></li>;
}

function SessionCard({ group, onAssign }) {
  return <article className="group-card"><div className="group-card-top"><div><strong>{group.name}</strong><span className="language">{group.language}</span></div><StatusBadge tone={group.tone}>{group.status}</StatusBadge></div><div className="group-detail"><span className="avatar avatar-tiny">{group.reader === 'Not assigned' ? '?' : 'MG'}</span><div><small>Reader</small><strong className={group.reader === 'Not assigned' ? 'muted' : ''}>{group.reader}</strong></div></div><div className="group-meta"><span>♧ {group.teacher}</span><span>▧ {group.book}</span></div>{group.tone === 'warning' && <button className="small-action" onClick={onAssign}>Assign volunteer</button>}</article>;
}

function Dashboard({ sessions = [], registeredSessions = [], onNewSession, onEditSession, onRegisterFamily, onManageSession, onAssignVolunteer, onSendNotification, onRetryNotification }) {
  const missingGroups = sessions.flatMap(session => session.missingGroups || []);
  const { formatDate, formatTime } = usePreferences();
  const hasSessions = sessions.length > 0;
  return <div className="dashboard-content">
    <section className="stats-grid" aria-label="Dashboard summary">
      <StatCard icon="◷" label="Upcoming sessions" value="3" context="This week" tone="green" />
      <StatCard icon="!" label="Missing volunteers" value={missingGroups.length || 2} context="Across 2 sessions" tone="amber" />
      <StatCard icon="✓" label="Confirmed readers" value="8" context="Of 10 assignments" tone="blue" />
      <StatCard icon="✉" label="Notifications pending" value="4" context="2 need attention" tone="rose" />
    </section>

    <div className="dashboard-grid">
      <div className="primary-column">
        <section className="panel next-session-panel" aria-label="Next reading session">
          {!hasSessions && <div className="empty-state"><span className="empty-icon">◷</span><strong>No upcoming reading sessions</strong><p>Create a reading session to start coordinating volunteers.</p><button className="small-action">Create session</button></div>}
          {hasSessions && <>
          <div className="panel-heading"><div><span className="section-kicker">Next reading session</span><h2>{formatDate('2026-10-06')} <span className="heading-muted">· {formatTime('07:40')}</span></h2><p>Grade 1 Reading Session <span className="dot-separator">•</span> 2 groups</p></div><StatusBadge tone="warning">Needs attention</StatusBadge></div>
          <div className="session-readiness"><div><span>Session readiness</span><strong>1 of 2 groups ready</strong></div><div className="progress-track"><span style={{ width: '50%' }} /></div><strong className="progress-value">50%</strong></div>
          <div className="group-list">{groups.map(group => <SessionCard key={group.name} group={group} onAssign={onAssignVolunteer} />)}</div>
          <button className="manage-session" onClick={onManageSession}>Manage session <span aria-hidden="true">→</span></button></>}
        </section>

        <section className="panel directory-panel" aria-label="Registered reading sessions">
          <div className="panel-heading compact"><div><span className="section-kicker">Operations</span><h2>Registered sessions</h2></div></div>
          {registeredSessions.length === 0
            ? <div className="empty-state"><span className="empty-icon">◷</span><strong>No reading sessions registered yet</strong><button className="small-action" onClick={onNewSession}>Create session</button></div>
            : registeredSessions.map(session => <div className="directory-row" key={session.id}><img className="session-thumb" src={session.image || '/assets/session-default.svg'} alt="" /><span className="date-chip">{formatDate(session.sessionDate)}</span><div><strong>{session.gradeName || session.gradeId || 'Reading session'}</strong><span>{formatTime(session.startTime)} · {session.status}</span></div><div className="row-actions"><AddToCalendar session={session} compact /><button className="small-action row-action" onClick={() => onEditSession(session)}>Edit</button></div></div>)}
        </section>

        <section className="panel calendar-panel" aria-label="Calendar">
          <div className="panel-heading compact"><div><span className="section-kicker">Schedule</span><h2>October 2026</h2></div><div className="view-switcher"><button className="selected">Month</button><button>Week</button><button>Agenda</button></div></div>
          <div className="calendar-grid"><div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-days">{['28','29','30','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','1','2'].map((day, index) => <span key={`${day}-${index}`} className={`${day === '6' ? 'today' : ''} ${['6','13','20','27'].includes(day) ? 'has-event' : ''}`}>{day}</span>)}</div></div>
        </section>
      </div>

      <aside className="secondary-column">
        <section className="panel attention-panel"><div className="panel-heading compact"><div><span className="section-kicker">Work queue</span><h2>Attention required</h2></div><span className="attention-count">3</span></div><ul className="attention-list"><AttentionItem icon="!" action="Assign" onAction={onAssignVolunteer}>Missing volunteer: Group B needs one for Tuesday</AttentionItem><AttentionItem icon="✉" action="Send" onAction={onSendNotification}>Teacher confirmation has not been sent</AttentionItem><AttentionItem icon="↻" action="Retry" onAction={onSendNotification}>WhatsApp volunteer request failed</AttentionItem></ul></section>
        <section className="panel quick-actions"><div className="panel-heading compact"><div><span className="section-kicker">Shortcuts</span><h2>Quick actions</h2></div></div><div className="quick-action-grid"><button onClick={onManageSession}><span>＋</span>New session</button><button onClick={onAssignVolunteer}><span>♧</span>Assign volunteer</button><button onClick={onRegisterFamily}><span>⌂</span>Register family</button><button onClick={onSendNotification}><span>✉</span>Send notification</button></div></section>
        <section className="panel upcoming-panel"><div className="panel-heading compact"><div><span className="section-kicker">Coming up</span><h2>Upcoming sessions</h2></div><button className="text-action">View all</button></div><div className="upcoming-item"><time><strong>06</strong><span>OCT</span></time><div><strong>Grade 1 Reading</strong><span>2 groups · 1 confirmed</span></div><StatusBadge tone="warning">Action needed</StatusBadge></div><div className="upcoming-item"><time><strong>13</strong><span>OCT</span></time><div><strong>Grade 2 Reading</strong><span>3 groups · Ready</span></div><StatusBadge tone="success">Ready</StatusBadge></div></section>
      </aside>
    </div>
  </div>;
}

export default Dashboard;
