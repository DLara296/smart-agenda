import { languageName } from '../history/sessionPresentation';

export const DEFAULT_SESSION_DURATION_MINUTES = 60;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})/;

export class CalendarExportError extends Error {}

const pad = value => String(value).padStart(2, '0');

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function parseLocal(date, time) {
  const day = DATE.exec(date || '');
  const clock = TIME.exec(time || '');
  if (!day || !clock) return null;
  const [year, month, dayOfMonth, hour, minute] = [...day.slice(1), ...clock.slice(1)].map(Number);
  const check = new Date(Date.UTC(year, month - 1, dayOfMonth, hour, minute));
  if (hour > 23 || minute > 59 || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== dayOfMonth) return null;
  return { year, month, day: dayOfMonth, hour, minute };
}

// Offset of `timezone` from UTC at a given instant, in milliseconds (DST-aware).
function timezoneOffset(instant, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(instant)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - instant;
}

function zonedToUtc(local, timezone) {
  const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const firstGuess = wallClock - timezoneOffset(wallClock, timezone);
  return new Date(wallClock - timezoneOffset(firstGuess, timezone));
}

function utcToZoned(date, timezone) {
  const shifted = new Date(date.getTime() + timezoneOffset(date.getTime(), timezone));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

export const formatLocal = local => `${local.year}${pad(local.month)}${pad(local.day)}T${pad(local.hour)}${pad(local.minute)}00`;

function describe(session) {
  const groups = session.groups || [];
  const names = list => [...new Set(list.filter(Boolean))].join(', ');
  // Reader names of other families arrive masked as "Assigned"; only real names are exported.
  const readers = names(groups.map(group => (group.reader && group.reader !== 'Assigned' ? group.reader : null)));
  const lines = [
    ['School', session.schoolName],
    ['Grade', session.gradeName],
    ['Group', names(groups.map(group => group.groupName))],
    ['Language', names(groups.map(group => languageName(group.language)))],
    ['Teacher', names(groups.map(group => group.teacherName))],
    ['Book', session.book],
    ['Reader', readers],
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  return ['SmartAgenda Reading Session', '', ...lines.map(([label, value]) => `${label}: ${value}`)].join('\n');
}

// Throws CalendarExportError with a user-facing message when the session can't be exported.
export function toCalendarEvent(session, { durationMinutes = DEFAULT_SESSION_DURATION_MINUTES } = {}) {
  const start = parseLocal(session?.sessionDate, session?.startTime);
  if (!start) throw new CalendarExportError('This session cannot be added to a calendar because its date or start time is missing.');
  const timezone = session.timezone;
  if (!timezone || !isValidTimezone(timezone)) throw new CalendarExportError("This session cannot be added to a calendar because its school's time zone isn't set.");
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new CalendarExportError('This session cannot be added to a calendar because its duration is invalid.');

  const startUtc = zonedToUtc(start, timezone);
  const explicitEnd = parseLocal(session.sessionDate, session.endTime);
  const explicitEndUtc = explicitEnd ? zonedToUtc(explicitEnd, timezone) : null;
  const endUtc = explicitEndUtc && explicitEndUtc > startUtc ? explicitEndUtc : new Date(startUtc.getTime() + durationMinutes * 60000);
  const groupNames = [...new Set((session.groups || []).map(group => group.groupName).filter(Boolean))].join(', ');

  return {
    title: ['Reading Session', [session.gradeName, groupNames].filter(Boolean).join(' · ')].filter(Boolean).join(' — '),
    start: startUtc,
    end: endUtc,
    startLocal: start,
    endLocal: utcToZoned(endUtc, timezone),
    timezone,
    location: session.schoolName || undefined,
    description: describe(session),
  };
}
