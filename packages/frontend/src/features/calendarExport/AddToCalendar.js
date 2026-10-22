import React, { useId, useMemo, useRef, useState } from 'react';
import { CalendarExportError, toCalendarEvent } from './calendarEvent';
import { CALENDAR_EXPORTERS, buildCalendarUrl } from './exporters';

const GENERIC_ERROR = "We couldn't prepare this calendar event. Please try again.";

function AddToCalendar({ session, compact = false }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  const prepared = useMemo(() => {
    try {
      const event = toCalendarEvent(session);
      return { links: Object.entries(CALENDAR_EXPORTERS).map(([provider, exporter]) => ({ provider, label: exporter.label, url: buildCalendarUrl(provider, event) })) };
    } catch (mapError) {
      return { error: mapError instanceof CalendarExportError ? mapError.message : GENERIC_ERROR };
    }
  }, [session]);

  const close = () => { setOpen(false); toggleRef.current?.focus(); };

  if (prepared.error) {
    return (
      <div className="add-to-calendar">
        <button type="button" className="button-secondary" disabled aria-describedby={`${menuId}-unavailable`} title={compact ? prepared.error : undefined}>Add to Calendar</button>
        <p id={`${menuId}-unavailable`} className={compact ? 'visually-hidden' : 'add-to-calendar-note'}>{prepared.error}</p>
      </div>
    );
  }

  return (
    <div className={`add-to-calendar ${compact ? 'compact' : ''}`} onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); close(); } }}>
      <button ref={toggleRef} type="button" className="button-secondary add-to-calendar-toggle" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
        Add to Calendar <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul id={menuId} className="add-to-calendar-menu" aria-label="Choose a calendar">
          {prepared.links.map(link => (
            <li key={link.provider}>
              {/* A real link opened by the user's click: never popup-blocked, and SmartAgenda saves nothing externally. */}
              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={close}>
                {link.label}<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {!compact && <p className="add-to-calendar-note">Opens your calendar with this session filled in. Nothing changes in SmartAgenda.</p>}
    </div>
  );
}

export default AddToCalendar;
