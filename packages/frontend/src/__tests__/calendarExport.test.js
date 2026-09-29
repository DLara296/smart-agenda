import { CalendarExportError, toCalendarEvent } from '../features/calendarExport/calendarEvent';
import { buildCalendarUrl } from '../features/calendarExport/exporters';

const session = overrides => ({
  sessionDate: '2026-10-06', startTime: '07:40', endTime: '08:40', timezone: 'America/New_York',
  schoolName: 'Colegio Peñalver & Hijos', gradeName: 'Grade 1',
  groups: [{ groupId: 'g1', groupName: 'Group A', language: 'es', teacherName: 'Miss Mariela', reader: 'María González' }],
  ...overrides,
});
const params = url => new URL(url).searchParams;

describe('toCalendarEvent', () => {
  it('builds the title, location, and description from available session data', () => {
    const event = toCalendarEvent(session());
    expect(event.title).toBe('Reading Session — Grade 1 · Group A');
    expect(event.location).toBe('Colegio Peñalver & Hijos');
    expect(event.description).toBe('SmartAgenda Reading Session\n\nSchool: Colegio Peñalver & Hijos\nGrade: Grade 1\nGroup: Group A\nLanguage: Spanish\nTeacher: Miss Mariela\nReader: María González');
  });

  it('omits missing optional fields and masked reader names without placeholders', () => {
    const event = toCalendarEvent(session({ schoolName: null, groups: [{ groupId: 'g1', groupName: null, language: 'en', teacherName: '', reader: 'Assigned' }] }));
    expect(event.title).toBe('Reading Session — Grade 1');
    expect(event.location).toBeUndefined();
    expect(event.description).toBe('SmartAgenda Reading Session\n\nGrade: Grade 1\nLanguage: English');
    expect(event.description).not.toMatch(/undefined|null|N\/A|Assigned|Reader|Teacher/);
    expect(toCalendarEvent(session({ gradeName: null, groups: [] })).title).toBe('Reading Session');
  });

  it('converts school-local times to the correct instant, including daylight saving', () => {
    expect(toCalendarEvent(session()).start.toISOString()).toBe('2026-10-06T11:40:00.000Z');
    expect(toCalendarEvent(session({ sessionDate: '2027-01-12' })).start.toISOString()).toBe('2027-01-12T12:40:00.000Z');
    expect(toCalendarEvent(session({ timezone: 'America/Mexico_City' })).start.toISOString()).toBe('2026-10-06T13:40:00.000Z');
    expect(toCalendarEvent(session({ timezone: 'UTC' })).start.toISOString()).toBe('2026-10-06T07:40:00.000Z');
  });

  it('uses the explicit end time, or the default duration when the end is missing or not after the start', () => {
    expect(toCalendarEvent(session()).end.toISOString()).toBe('2026-10-06T12:40:00.000Z');
    expect(toCalendarEvent(session({ endTime: '07:40' })).end.toISOString()).toBe('2026-10-06T12:40:00.000Z');
    expect(toCalendarEvent(session({ endTime: null }), { durationMinutes: 45 }).end.toISOString()).toBe('2026-10-06T12:25:00.000Z');
    expect(toCalendarEvent(session({ startTime: '23:30', endTime: null })).endLocal).toEqual({ year: 2026, month: 10, day: 7, hour: 0, minute: 30 });
  });

  it.each([
    [{ sessionDate: null }, 'date or start time is missing'],
    [{ startTime: '' }, 'date or start time is missing'],
    [{ sessionDate: '2026-02-30' }, 'date or start time is missing'],
    [{ startTime: '25:10' }, 'date or start time is missing'],
    [{ timezone: undefined }, "time zone isn't set"],
    [{ timezone: 'Mars/Olympus' }, "time zone isn't set"],
  ])('rejects sessions that cannot become a valid event (%o)', (overrides, message) => {
    expect(() => toCalendarEvent(session(overrides))).toThrow(CalendarExportError);
    expect(() => toCalendarEvent(session(overrides))).toThrow(message);
  });

  it('rejects an invalid duration', () => {
    expect(() => toCalendarEvent(session({ endTime: null }), { durationMinutes: 0 })).toThrow('duration is invalid');
  });
});

describe('calendar exporters', () => {
  const event = toCalendarEvent(session());

  it('builds a Google Calendar URL with local times, the timezone, and encoded text', () => {
    const url = buildCalendarUrl('google', event);
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const query = params(url);
    expect(query.get('action')).toBe('TEMPLATE');
    expect(query.get('text')).toBe('Reading Session — Grade 1 · Group A');
    expect(query.get('dates')).toBe('20261006T074000/20261006T084000');
    expect(query.get('ctz')).toBe('America/New_York');
    expect(query.get('location')).toBe('Colegio Peñalver & Hijos');
    expect(query.get('details')).toContain('Reader: María González');
    expect(url).not.toContain('Peñalver & Hijos');
  });

  it('builds an Outlook URL with the same event information as UTC instants', () => {
    const query = params(buildCalendarUrl('outlook', event));
    expect(query.get('rru')).toBe('addevent');
    expect(query.get('subject')).toBe(event.title);
    expect(query.get('startdt')).toBe('2026-10-06T11:40:00.000Z');
    expect(query.get('enddt')).toBe('2026-10-06T12:40:00.000Z');
    expect(query.get('body')).toBe(event.description);
    expect(query.get('location')).toBe(event.location);
  });

  it('omits empty parameters and rejects unsupported providers', () => {
    const bare = toCalendarEvent(session({ schoolName: null }));
    expect(params(buildCalendarUrl('google', bare)).has('location')).toBe(false);
    expect(() => buildCalendarUrl('carrier-pigeon', event)).toThrow('This calendar provider is not supported.');
  });
});
