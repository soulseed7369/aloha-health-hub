/**
 * Minimal iCal (.ics) generation utilities.
 * Generates RFC 5545-compliant VCALENDAR strings from event data.
 */

function icalDate(dateStr: string, timeStr: string | null): string {
  // Returns YYYYMMDDTHHMMSS (local) or YYYYMMDD (all-day)
  if (!timeStr) {
    return dateStr.replace(/-/g, '');
  }
  const [h, m] = timeStr.split(':');
  const datePart = dateStr.replace(/-/g, '');
  const timePart = `${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
  return `${datePart}T${timePart}`;
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export interface IcalEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  url?: string | null;
}

export function buildIcalString(event: IcalEventInput): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@hawaiiwellness.net`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const dtstart = event.event_date
    ? icalDate(event.event_date, event.start_time ?? null)
    : null;
  const dtend = event.event_date && event.end_time
    ? icalDate(event.event_date, event.end_time)
    : dtstart;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hawaiʻi Wellness//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  if (dtstart) {
    const isAllDay = !event.start_time;
    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
    } else {
      lines.push(`DTSTART:${dtstart}`);
      if (dtend) lines.push(`DTEND:${dtend}`);
    }
  }

  lines.push(`SUMMARY:${escapeIcal(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcal(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcal(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/** Triggers a .ics file download in the browser. */
export function downloadIcal(event: IcalEventInput): void {
  const ics = buildIcalString(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${event.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a Google Calendar "add event" URL. */
export function googleCalendarUrl(event: IcalEventInput): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams();
  params.set('text', event.title);

  if (event.event_date) {
    const start = icalDate(event.event_date, event.start_time ?? null);
    const end   = event.end_time
      ? icalDate(event.event_date, event.end_time)
      : start;
    params.set('dates', `${start}/${end}`);
  }
  if (event.description) params.set('details', event.description);
  if (event.location)    params.set('location', event.location);
  if (event.url)         params.set('sprop', `website:${event.url}`);

  return `${base}&${params.toString()}`;
}
