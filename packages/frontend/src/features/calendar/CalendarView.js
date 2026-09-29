import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '../settings/PreferencesContext';
import { useI18n } from '../../i18n/I18nContext';
import { StatusPill, dateKey, groupNames, groupSummary, pad, parseDay, relationLabel, sessionLanguage, statusLabel, statusOf } from '../history/sessionPresentation';
import AddToCalendar from '../calendarExport/AddToCalendar';

const LOAD_ERROR = "We couldn't load the reading sessions. Please try again.";
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_EVENTS_PER_CELL = 2;

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfWeek = date => addDays(date, -((date.getDay() + 6) % 7));
const isMobile = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches;

function SessionDetail({ session, familyChildren, today, formatDate, formatTime, longDate, onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const onKeyDown = event => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    // Keep keyboard focus cycling inside the dialog.
    const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const status = statusOf(session, today);
  return (
    <div className="calendar-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="calendar-dialog panel" role="dialog" aria-modal="true" aria-labelledby="calendar-dialog-title" onKeyDown={onKeyDown}>
        <div className="calendar-dialog-top">
          <div>
            <span className="section-kicker">Reading session</span>
            <h2 id="calendar-dialog-title">{groupSummary(session)}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-button" aria-label="Close session details" onClick={onClose}>✕</button>
        </div>
        <p className={`guest-relation ${session.relatedChildren?.length ? 'direct' : ''}`}>{relationLabel(session, familyChildren)}</p>
        <dl className="guest-facts">
          <div><dt>Date</dt><dd>{longDate(session.sessionDate)} ({formatDate(session.sessionDate)})</dd></div>
          <div><dt>Time</dt><dd>{formatTime(session.startTime)}{session.endTime && session.endTime !== session.startTime ? ` – ${formatTime(session.endTime)}` : ''}</dd></div>
          {session.schoolName && <div><dt>School</dt><dd>{session.schoolName}</dd></div>}
          <div><dt>Grade</dt><dd>{session.gradeName || '—'}</dd></div>
          <div><dt>Status</dt><dd><StatusPill status={status} /></dd></div>
        </dl>
        {session.groups?.length > 0 && (
          <div className="calendar-dialog-groups">
            {session.groups.map(group => (
              <dl key={group.groupId} className="guest-facts">
                <div><dt>Group</dt><dd>{group.groupName || '—'}</dd></div>
                <div><dt>Teacher</dt><dd>{group.teacherName || '—'}</dd></div>
                <div><dt>Language</dt><dd>{sessionLanguage({ groups: [group] }) || '—'}</dd></div>
                <div><dt>Reader</dt><dd>{group.reader || 'Not assigned yet'}</dd></div>
              </dl>
            ))}
          </div>
        )}
        <AddToCalendar session={session} />
      </div>
    </div>
  );
}

function CalendarView() {
  const { formatDate, formatTime } = usePreferences();
  const { language } = useI18n();
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const [state, setState] = useState({ status: 'loading', data: null });
  const [mode, setMode] = useState(() => (isMobile() ? 'agenda' : 'month'));
  const [cursor, setCursor] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [detail, setDetail] = useState(null);
  const triggerRef = useRef(null);
  const today = dateKey(new Date());

  const load = useCallback(() => {
    setState(previous => ({ ...previous, status: 'loading' }));
    // Same endpoint and access rules as History: the server derives the grades from the signed-in account.
    fetch('/v1/history/sessions', { credentials: 'include' })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(LOAD_ERROR))))
      .then(payload => setState({ status: 'ready', data: payload.data }))
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sessions = useMemo(() => [...new Map((state.data?.sessions || []).map(session => [session.id, session])).values()]
    .sort((a, b) => `${a.sessionDate}${a.startTime}`.localeCompare(`${b.sessionDate}${b.startTime}`)), [state.data]);
  const children = state.data?.children || [];

  useEffect(() => {
    if (state.status !== 'ready' || cursor) return;
    const next = sessions.find(session => session.sessionDate >= today);
    setCursor(next ? parseDay(next.sessionDate) : new Date());
  }, [state.status, sessions, cursor, today]);

  const base = cursor || new Date();
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const weekStart = startOfWeek(base);
  const range = mode === 'week'
    ? { from: dateKey(weekStart), to: dateKey(addDays(weekStart, 6)) }
    : { from: dateKey(monthStart), to: dateKey(new Date(base.getFullYear(), base.getMonth() + 1, 0)) };
  const periodSessions = sessions.filter(session => session.sessionDate >= range.from && session.sessionDate <= range.to);
  const byDay = periodSessions.reduce((map, session) => map.set(session.sessionDate, [...(map.get(session.sessionDate) || []), session]), new Map());

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthStart);
  const shortDay = date => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  const periodLabel = mode === 'week' ? `${shortDay(weekStart)} – ${shortDay(addDays(weekStart, 6))}, ${addDays(weekStart, 6).getFullYear()}` : monthLabel;
  const longDate = day => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(parseDay(day));
  const eventLabel = session => [
    session.gradeName,
    groupNames(session),
    `${[sessionLanguage(session), 'reading session'].filter(Boolean).join(' ')}`,
    `${longDate(session.sessionDate)} at ${formatTime(session.startTime)}`,
    statusLabel(statusOf(session, today)),
  ].filter(Boolean).join(', ');

  const move = direction => {
    setSelectedDay(null);
    setCursor(mode === 'week' ? addDays(base, 7 * direction) : new Date(base.getFullYear(), base.getMonth() + direction, 1));
  };
  const openDetail = (session, event) => { triggerRef.current = event.currentTarget; setDetail(session); };
  const closeDetail = () => { setDetail(null); triggerRef.current?.focus(); };

  const renderEvent = (session, compact = false) => (
    <button key={session.id} type="button" className={`calendar-event ${statusOf(session, today)}`} aria-label={eventLabel(session)} onClick={event => openDetail(session, event)}>
      <strong>{formatTime(session.startTime)}</strong>
      <span>{groupSummary(session)}</span>
      {!compact && <span>{[sessionLanguage(session), statusLabel(statusOf(session, today))].filter(Boolean).join(' · ')}</span>}
    </button>
  );

  const header = (
    <div className="panel-heading compact calendar-header">
      <div><h1>Calendar</h1></div>
      {state.status === 'ready' && children.length > 0 && (
        <div className="calendar-toolbar">
          <div className="calendar-nav" role="group" aria-label="Calendar navigation">
            <button type="button" className="icon-button" aria-label={mode === 'week' ? 'Previous week' : 'Previous month'} onClick={() => move(-1)}>‹</button>
            <button type="button" className="button-secondary" onClick={() => { setSelectedDay(null); setCursor(new Date()); }}>Today</button>
            <button type="button" className="icon-button" aria-label={mode === 'week' ? 'Next week' : 'Next month'} onClick={() => move(1)}>›</button>
          </div>
          <div className="view-switcher" role="group" aria-label="Calendar view">
            {['month', 'week', 'agenda'].map(option => (
              <button key={option} type="button" className={mode === option ? 'selected' : ''} aria-pressed={mode === option} onClick={() => { setMode(option); setSelectedDay(null); }}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (state.status === 'loading' && !state.data) {
    return (
      <section className="panel calendar-view" aria-label="Calendar" aria-busy="true">
        {header}
        <p className="visually-hidden" role="status">Loading reading sessions...</p>
        <div className="calendar-skeleton" aria-hidden="true">{Array.from({ length: 35 }, (_, index) => <span key={index} />)}</div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="panel calendar-view" aria-label="Calendar">
        {header}
        <div className="form-status error history-error" role="alert"><span>{LOAD_ERROR}</span><button type="button" className="small-action" onClick={load}>Try again</button></div>
      </section>
    );
  }

  if (children.length === 0 || sessions.length === 0) {
    return (
      <section className="panel calendar-view" aria-label="Calendar">
        {header}
        <div className="empty-state"><span className="empty-icon">◷</span><strong>{children.length === 0 ? 'No grade information is available for your family yet.' : "No reading sessions are currently available for your children's grades."}</strong></div>
      </section>
    );
  }

  const leading = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const monthCells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => new Date(base.getFullYear(), base.getMonth(), index + 1))];
  const emptyPeriod = periodSessions.length === 0 && <p className="calendar-empty" role="status">No reading sessions scheduled for this period.</p>;

  return (
    <section className="panel calendar-view" aria-label="Calendar">
      {header}
      <h2 className="calendar-period" aria-live="polite">{periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}</h2>

      {mode === 'month' && (
        <>
          <div className="calendar-month" role="group" aria-label={monthLabel}>
            {WEEKDAYS.map(day => <span key={day} className="calendar-weekday" aria-hidden="true">{day}</span>)}
            {monthCells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="calendar-cell blank" aria-hidden="true" />;
              const key = dateKey(day);
              const events = byDay.get(key) || [];
              return (
                <div key={key} className={`calendar-cell ${key === today ? 'today' : ''}`} aria-label={`${longDate(key)}, ${events.length} session${events.length === 1 ? '' : 's'}`} role="group">
                  <span className="calendar-day-number" aria-hidden="true">{day.getDate()}</span>
                  {events.slice(0, MAX_EVENTS_PER_CELL).map(session => renderEvent(session, true))}
                  {events.length > MAX_EVENTS_PER_CELL && (
                    <button type="button" className="calendar-more" aria-expanded={selectedDay === key} onClick={() => setSelectedDay(selectedDay === key ? null : key)} aria-label={`Show all ${events.length} sessions on ${longDate(key)}`}>+{events.length - MAX_EVENTS_PER_CELL} more</button>
                  )}
                </div>
              );
            })}
          </div>
          {selectedDay && (
            <div className="calendar-day-list" aria-label={`Sessions on ${longDate(selectedDay)}`} role="region">
              <h3>{longDate(selectedDay)}</h3>
              {(byDay.get(selectedDay) || []).map(session => renderEvent(session))}
            </div>
          )}
          {emptyPeriod}
        </>
      )}

      {mode === 'week' && (
        <>
          <div className="calendar-week">
            {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((day, index) => {
              const key = dateKey(day);
              const events = byDay.get(key) || [];
              return (
                <div key={key} className={`calendar-week-day ${key === today ? 'today' : ''}`} role="group" aria-label={`${longDate(key)}, ${events.length} session${events.length === 1 ? '' : 's'}`}>
                  <div className="calendar-week-heading" aria-hidden="true"><span>{WEEKDAYS[index]}</span><strong>{day.getDate()}</strong></div>
                  {events.length === 0 ? <span className="calendar-week-none" aria-hidden="true">—</span> : events.map(session => renderEvent(session))}
                </div>
              );
            })}
          </div>
          {emptyPeriod}
        </>
      )}

      {mode === 'agenda' && (
        periodSessions.length === 0 ? emptyPeriod : (
          <ol className="calendar-agenda">
            {[...byDay.entries()].map(([key, events]) => (
              <li key={key}>
                <div className="calendar-agenda-date" aria-hidden="true"><strong>{pad(parseDay(key).getDate())}</strong><span>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parseDay(key))}</span></div>
                <div className="calendar-agenda-events">
                  <span className="visually-hidden">{longDate(key)}</span>
                  {events.map(session => (
                    <button key={session.id} type="button" className="calendar-agenda-item" aria-label={eventLabel(session)} onClick={event => openDetail(session, event)}>
                      <div>
                        <strong>{session.gradeName ? `${session.gradeName} Reading Session` : 'Reading session'}</strong>
                        <span>{formatTime(session.startTime)}</span>
                        <span>{[groupNames(session), sessionLanguage(session)].filter(Boolean).join(' · ')}</span>
                      </div>
                      <StatusPill status={statusOf(session, today)} />
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )
      )}

      {detail && <SessionDetail session={detail} familyChildren={children} today={today} formatDate={formatDate} formatTime={formatTime} longDate={longDate} onClose={closeDetail} />}
    </section>
  );
}

export default CalendarView;
