import { CalendarExportError, formatLocal } from './calendarEvent';

const withParams = (base, params) => {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
  return url.toString();
};

// Each exporter turns the same normalized CalendarEvent into a provider URL; add new providers here.
export const CALENDAR_EXPORTERS = {
  google: {
    label: 'Google Calendar',
    buildUrl: event => withParams('https://calendar.google.com/calendar/render', {
      action: 'TEMPLATE',
      text: event.title,
      // Wall-clock times plus ctz keep the event at the school's local time.
      dates: `${formatLocal(event.startLocal)}/${formatLocal(event.endLocal)}`,
      ctz: event.timezone,
      details: event.description,
      location: event.location,
    }),
  },
  outlook: {
    label: 'Outlook Calendar',
    buildUrl: event => withParams('https://outlook.live.com/calendar/0/deeplink/compose', {
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: event.start.toISOString(),
      enddt: event.end.toISOString(),
      body: event.description,
      location: event.location,
    }),
  },
};

export function buildCalendarUrl(provider, event) {
  const exporter = CALENDAR_EXPORTERS[provider];
  if (!exporter) throw new CalendarExportError('This calendar provider is not supported.');
  return exporter.buildUrl(event);
}
