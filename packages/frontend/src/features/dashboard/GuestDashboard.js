import React, { useEffect, useMemo, useState } from 'react';
import { usePreferences } from '../settings/PreferencesContext';
import { useI18n } from '../../i18n/I18nContext';
import { FamilyAvatar } from '../family/FamilyAvatar';
import { StatusPill, dateKey, groupSummary, pad, parseDay, relationLabel, sessionLanguage, statusOf } from '../history/sessionPresentation';
import AddToCalendar from '../calendarExport/AddToCalendar';

function schoolYearStart(now) {
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
}

function FamilyCalendar({ sessions, today, formatTime, locale, onOpenHistory }) {
  const firstUpcoming = sessions.find(session => session.sessionDate >= today);
  const [cursor, setCursor] = useState(() => { const base = parseDay(firstUpcoming?.sessionDate || today); return new Date(base.getFullYear(), base.getMonth(), 1); });
  const [mode, setMode] = useState(() => (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches ? 'agenda' : 'month'));
  const [selected, setSelected] = useState(null);
  const byDay = useMemo(() => sessions.reduce((map, session) => map.set(session.sessionDate, [...(map.get(session.sessionDate) || []), session]), new Map()), [sessions]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor);
  const monthPrefix = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
  const monthSessions = sessions.filter(session => session.sessionDate.startsWith(monthPrefix));
  const leading = (cursor.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const move = offset => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1)); setSelected(null); };
  const selectedSessions = selected ? byDay.get(selected) || [] : [];

  return (
    <section className="panel guest-calendar" aria-label="Family calendar">
      <div className="panel-heading compact">
        <div><span className="section-kicker">Family calendar · Your children's sessions</span><h2>{monthLabel}</h2></div>
        <div className="guest-calendar-controls">
          <button type="button" className="icon-button" aria-label="Previous month" onClick={() => move(-1)}>‹</button>
          <button type="button" className="icon-button" aria-label="Next month" onClick={() => move(1)}>›</button>
          <div className="view-switcher" role="group" aria-label="Calendar view">
            <button type="button" className={mode === 'month' ? 'selected' : ''} aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
            <button type="button" className={mode === 'agenda' ? 'selected' : ''} aria-pressed={mode === 'agenda'} onClick={() => setMode('agenda')}>Agenda</button>
          </div>
        </div>
      </div>
      {mode === 'month' && (
        <>
          <div className="guest-month" role="group" aria-label={monthLabel}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day} className="guest-weekday">{day}</span>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} />;
              const key = `${monthPrefix}-${pad(day)}`;
              const has = byDay.has(key);
              return (
                <button key={key} type="button" className={`guest-day ${key === today ? 'today' : ''} ${selected === key ? 'selected' : ''}`} aria-label={`${day}${has ? `, ${byDay.get(key).length} session(s)` : ''}`} disabled={!has} onClick={() => setSelected(selected === key ? null : key)}>
                  {day}{has && <span className="guest-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {selectedSessions.map(session => <p key={session.id} className="guest-day-detail"><strong>{formatTime(session.startTime)}</strong> {groupSummary(session)} · <StatusPill status={statusOf(session, today)} /></p>)}
        </>
      )}
      {mode === 'agenda' && (
        monthSessions.length === 0
          ? <p className="guest-muted">No sessions for your children this month.</p>
          : <ul className="guest-agenda">{monthSessions.map(session => <li key={session.id}><span className="guest-agenda-day">{pad(parseDay(session.sessionDate).getDate())}</span><div><strong>{session.relatedChildren?.length ? `${session.relatedChildren.map(child => child.name).join(' & ')} · Reading session` : `${session.gradeName || 'Grade'} Reading`}</strong><span>{[formatTime(session.startTime), sessionLanguage(session)].filter(Boolean).join(' · ')}</span></div><StatusPill status={statusOf(session, today)} /></li>)}</ul>
      )}
      <button type="button" className="text-action" onClick={onOpenHistory}>Open full history →</button>
    </section>
  );
}

function GuestDashboard({ user, onOpenHistory, onRegisterFamily, onNewSession }) {
  const { formatDate, formatTime } = usePreferences();
  const { language } = useI18n();
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const [family, setFamily] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [created, setCreated] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const get = url => fetch(url, { credentials: 'include' }).then(response => (response.ok ? response.json() : Promise.reject(new Error(url))));
    Promise.all([
      get('/v1/families/me').then(payload => payload.data || null),
      get('/v1/history/sessions').then(payload => payload.data?.sessions || []),
      get('/v1/sessions').then(data => (Array.isArray(data) ? data : [])).catch(() => []),
    ])
      .then(([familyData, historySessions, allSessions]) => {
        setFamily(familyData);
        setHistory(historySessions);
        setCreated(allSessions.filter(session => session.createdBy === user?.id));
      })
      .catch(() => setError(true));
  }, [user?.id]);

  const now = new Date();
  const today = dateKey(now);
  const children = family?.children || [];
  const sessions = useMemo(() => {
    const merged = new Map(history.map(session => [session.id, session]));
    created.forEach(session => { if (!merged.has(session.id)) merged.set(session.id, { ...session, gradeName: session.gradeName || session.gradeId, groups: [], relatedChildren: [], createdByMe: true }); });
    return [...merged.values()].sort((a, b) => `${a.sessionDate}${a.startTime}`.localeCompare(`${b.sessionDate}${b.startTime}`));
  }, [history, created]);
  const upcoming = sessions.filter(session => session.sessionDate >= today && session.status !== 'cancelled');
  const next = upcoming[0];
  const participation = sessions.filter(session => session.relatedChildren?.length && session.status !== 'cancelled' && session.sessionDate < today && session.sessionDate >= schoolYearStart(now));
  const recent = sessions.filter(session => session.relatedChildren?.length && session.sessionDate < today).reverse().slice(0, 3);
  const gradeNames = [...new Set(children.map(child => child.gradeName).filter(Boolean))];
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';
  const greetingName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const weekday = date => new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parseDay(date));
  const chip = date => ({ month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(parseDay(date)).toUpperCase(), day: pad(parseDay(date).getDate()) });

  const actions = [];
  if (family === null) actions.push({ label: 'Complete your family profile', action: onRegisterFamily, cta: 'Register family' });
  else if (family && children.length === 0) actions.push({ label: 'Add your children to see their reading sessions', action: onRegisterFamily, cta: 'Update family' });
  sessions.filter(session => session.status === 'cancelled' && session.sessionDate >= today && session.relatedChildren?.length)
    .forEach(session => actions.push({ label: `A session for ${session.relatedChildren.map(child => child.name).join(' & ')} on ${formatDate(session.sessionDate)} was cancelled`, action: () => onOpenHistory('all'), cta: 'Review' }));

  if (error) return <section className="panel guest-dashboard-error" role="alert"><strong>We couldn't load your family dashboard.</strong><p>Please refresh the page to try again.</p></section>;
  if (family === undefined) return <p className="guest-muted" role="status">Loading your family dashboard...</p>;

  return (
    <div className="guest-dashboard">
      <header className="guest-header">
        <div>
          <h1>{greeting}{greetingName ? `, ${greetingName}` : ''} <span aria-hidden="true">👋</span></h1>
          <p className="welcome-copy">Here's what's happening with your family.</p>
          {family && <p className="guest-family-line">{family.displayName} · {children.length} {children.length === 1 ? 'child' : 'children'} · {gradeNames.length} {gradeNames.length === 1 ? 'grade' : 'grades'}</p>}
        </div>
        <div className="guest-header-side">
          {onNewSession && <button type="button" className="button-secondary" onClick={onNewSession}>＋ New reading session</button>}
          {family && <FamilyAvatar value={family.avatar} kind="household" name={family.displayName} size="large" />}
        </div>
      </header>

      <section className="guest-summary" aria-label="Family summary">
        <article className="stat-card"><span className="stat-icon green">◷</span><div><span className="stat-label">Upcoming sessions</span><strong>{upcoming.length}</strong><small>Across your grades</small></div></article>
        <article className="stat-card"><span className="stat-icon blue">☺</span><div><span className="stat-label">My children</span><strong>{children.length}</strong><small>{gradeNames.join(' · ') || 'No grades yet'}</small></div></article>
        <article className="stat-card"><span className="stat-icon amber">✓</span><div><span className="stat-label">Family participation</span><strong>{participation.length} {participation.length === 1 ? 'session' : 'sessions'}</strong><small>This school year</small></div></article>
      </section>

      <div className="guest-grid">
        <section className="panel guest-next" aria-label="Next reading session">
          <span className="section-kicker">Next reading session</span>
          {!next ? <div className="empty-state"><span className="empty-icon">◷</span><strong>No upcoming reading sessions</strong><p>Sessions for your children's grades will appear here.</p></div> : (
            <>
              <div className="guest-next-top">
                <div>
                  <h2>{weekday(next.sessionDate)}, {formatDate(next.sessionDate)}</h2>
                  <p className="guest-next-time">{formatTime(next.startTime)}</p>
                </div>
                <StatusPill status={statusOf(next, today)} />
              </div>
              <p className={`guest-relation ${next.relatedChildren?.length ? 'direct' : ''}`}>{relationLabel(next, children)}</p>
              <dl className="guest-facts">
                <div><dt>Class</dt><dd>{groupSummary(next)}</dd></div>
                {sessionLanguage(next) && <div><dt>Language</dt><dd>{sessionLanguage(next)}</dd></div>}
                {next.groups?.[0]?.teacherName && <div><dt>Teacher</dt><dd>{next.groups[0].teacherName}</dd></div>}
                {next.groups?.[0] && <div><dt>Reader</dt><dd>{next.groups[0].reader || 'Not assigned yet'}</dd></div>}
                {next.schoolName && <div><dt>School</dt><dd>{next.schoolName}</dd></div>}
              </dl>
              <div className="guest-next-actions">
                <button type="button" className="text-action" onClick={() => onOpenHistory('all')}>View details →</button>
                <AddToCalendar session={next} compact />
              </div>
            </>
          )}
        </section>

        <section className="panel guest-children" aria-label="My children">
          <span className="section-kicker">My children</span>
          {children.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">⌂</span><strong>No children registered yet</strong><button type="button" className="small-action" onClick={onRegisterFamily}>{family ? 'Update family' : 'Register family'}</button></div>
          ) : children.map(child => {
            const childNext = upcoming.find(session => session.relatedChildren?.some(item => item.id === child.id));
            return (
              <article className="guest-child" key={child.id}>
                <div className="guest-child-top">
                  <FamilyAvatar value={child.avatar} kind="child" name={child.name} />
                  <div><strong>{child.name}</strong><span>{[child.gradeName, child.groupName].filter(Boolean).join(' · ')}</span></div>
                </div>
                <div className="guest-child-next">
                  <small>Next session</small>
                  {childNext
                    ? <p>{formatDate(childNext.sessionDate)} · {formatTime(childNext.startTime)}{sessionLanguage(childNext, child) ? ` · ${sessionLanguage(childNext, child)}` : ''} <StatusPill status={statusOf(childNext, today)} /></p>
                    : <p className="guest-muted">No sessions scheduled for their group yet</p>}
                </div>
                <button type="button" className="text-action" onClick={() => onOpenHistory(`child:${child.id}`)}>View sessions →</button>
              </article>
            );
          })}
        </section>

        <section className="panel guest-coming-up" aria-label="Coming up">
          <span className="section-kicker">Coming up</span>
          {upcoming.length === 0 ? <p className="guest-muted">Nothing scheduled yet.</p> : (
            <ul className="guest-timeline">
              {upcoming.slice(0, 5).map(session => (
                <li key={session.id}>
                  <time dateTime={session.sessionDate}><span>{chip(session.sessionDate).month}</span><strong>{chip(session.sessionDate).day}</strong></time>
                  <div>
                    <strong>{session.gradeName ? `${session.gradeName} Reading` : 'Reading session'}</strong>
                    <span>{session.relatedChildren?.length ? `${session.relatedChildren.map(child => child.name).join(' & ')} · ` : ''}{session.groups?.map(group => group.groupName).filter(Boolean).join(', ') || relationLabel(session, children)}</span>
                    <span>{[sessionLanguage(session), formatTime(session.startTime)].filter(Boolean).join(' · ')}</span>
                  </div>
                  <StatusPill status={statusOf(session, today)} />
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="text-action" onClick={() => onOpenHistory('all')}>View all sessions →</button>
        </section>

        <aside className="guest-side">
          <section className="panel guest-actions" aria-label="Action required">
            <span className="section-kicker">Action required</span>
            {actions.length === 0 ? <p className="guest-caught-up">You're all caught up <span aria-hidden="true">✓</span></p> : (
              <ul>{actions.map(item => <li key={item.label}><span>{item.label}</span><button type="button" className="text-action" onClick={item.action}>{item.cta}</button></li>)}</ul>
            )}
          </section>

          <section className="panel guest-recent" aria-label="Recent activity">
            <span className="section-kicker">Recent activity</span>
            {recent.length === 0 ? <p className="guest-muted">Your family's past sessions will appear here.</p> : (
              <ul className="guest-timeline compact">
                {recent.map(session => {
                  const reader = session.groups?.find(group => group.reader && group.reader !== 'Assigned')?.reader;
                  return (
                    <li key={session.id}>
                      <time dateTime={session.sessionDate}><span>{chip(session.sessionDate).month}</span><strong>{chip(session.sessionDate).day}</strong></time>
                      <div>
                        <strong>{session.gradeName ? `${session.gradeName} Reading` : 'Reading session'}</strong>
                        <span>{session.relatedChildren.map(child => child.name).join(' & ')}{session.groups?.[0]?.groupName ? ` · ${session.groups[0].groupName}` : ''}</span>
                        {reader && <span>{reader} volunteered</span>}
                      </div>
                      <StatusPill status={statusOf(session, today)} />
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="text-action" onClick={() => onOpenHistory('children')}>View history →</button>
          </section>
        </aside>
      </div>

      {/* The dashboard calendar is limited to sessions a registered child actually takes part in. */}
      <FamilyCalendar sessions={sessions.filter(session => session.relatedChildren?.length)} today={today} formatTime={formatTime} locale={locale} onOpenHistory={() => onOpenHistory('children')} />
    </div>
  );
}

export default GuestDashboard;
