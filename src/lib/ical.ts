/**
 * iCal (.ics) import utilities for center owners.
 *
 * Centers can paste a Google Calendar / Apple Calendar iCal URL or upload
 * a .ics file to bulk-populate their events dashboard.
 *
 * Parses RFC 5545 VCALENDAR → array of EventFormData-compatible objects.
 */

import type { EventFormData } from "@/hooks/useCenterEvents";

// ─── Internal VEVENT shape ────────────────────────────────────────────────────

interface ParsedVEvent {
  summary:     string;
  description: string;
  dtstart:     string;   // raw value e.g. "20260401T090000" or "20260401"
  dtend:       string;
  location:    string;
  url:         string;
  rrule:       string;   // raw RRULE value e.g. "FREQ=WEEKLY;BYDAY=TU"
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function unfoldLines(raw: string): string[] {
  // RFC 5545 line folding: continuation lines start with space or tab
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')   // unfold
    .split('\n');
}

function parseValue(line: string): { name: string; params: string; value: string } {
  const colon = line.indexOf(':');
  if (colon === -1) return { name: '', params: '', value: '' };
  const nameAndParams = line.slice(0, colon);
  const value         = line.slice(colon + 1);
  const semi          = nameAndParams.indexOf(';');
  if (semi === -1) return { name: nameAndParams.toUpperCase(), params: '', value };
  return {
    name:   nameAndParams.slice(0, semi).toUpperCase(),
    params: nameAndParams.slice(semi + 1),
    value,
  };
}

function icalDateToISO(raw: string): { date: string; time: string } {
  // Handles: 20260401, 20260401T090000, 20260401T090000Z
  const clean = raw.replace('Z', '').replace(/[T]/g, '');
  const date  = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const hasTime = raw.includes('T');
  if (!hasTime) return { date, time: '' };
  const timePart = clean.slice(8); // HHMMSS
  const time = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
  return { date, time };
}

function rruleToHuman(rrule: string): string {
  // Very simple — just make it readable enough for the recurrence_rule text field
  const parts = Object.fromEntries(
    rrule.split(';').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    })
  );
  const freq = parts['FREQ']?.toLowerCase() ?? '';
  const byday = parts['BYDAY'];
  if (byday) {
    const dayMap: Record<string, string> = {
      MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu',
      FR: 'Fri', SA: 'Sat', SU: 'Sun',
    };
    const days = byday.split(',').map((d) => dayMap[d] ?? d).join('/');
    return `Every ${days}`;
  }
  if (freq === 'daily')   return 'Daily';
  if (freq === 'weekly')  return 'Weekly';
  if (freq === 'monthly') return 'Monthly';
  return rrule;
}

export interface IcalImportEvent extends Partial<EventFormData> {
  _raw?: ParsedVEvent;
}

export function parseIcalText(text: string): IcalImportEvent[] {
  const lines   = unfoldLines(text);
  const events: IcalImportEvent[] = [];
  let current: Partial<ParsedVEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (trimmed === 'END:VEVENT' && current) {
      if (current.summary) {
        const start   = current.dtstart ? icalDateToISO(current.dtstart) : { date: '', time: '' };
        const end     = current.dtend   ? icalDateToISO(current.dtend)   : { date: '', time: '' };
        const isRecurring = !!current.rrule;

        events.push({
          title:           current.summary ?? '',
          description:     current.description ?? '',
          event_date:      start.date,
          start_time:      start.time,
          end_time:        end.time,
          location:        current.location ?? '',
          registration_url: current.url ?? '',
          price_mode:      'contact',
          price_fixed:     '',
          price_min:       '',
          price_max:       '',
          max_attendees:   '',
          is_recurring:    isRecurring,
          recurrence_rule: isRecurring ? rruleToHuman(current.rrule ?? '') : '',
          status:          'published',
          _raw:            current as ParsedVEvent,
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const { name, value } = parseValue(trimmed);
    switch (name) {
      case 'SUMMARY':     current.summary     = value; break;
      case 'DESCRIPTION': current.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ','); break;
      case 'DTSTART':     current.dtstart     = value; break;
      case 'DTEND':       current.dtend       = value; break;
      case 'LOCATION':    current.location    = value; break;
      case 'URL':         current.url         = value; break;
      case 'RRULE':       current.rrule       = value; break;
    }
  }

  return events;
}

/** Fetch an iCal URL and return parsed events. Requires the URL to be CORS-accessible. */
export async function fetchAndParseIcal(url: string): Promise<IcalImportEvent[]> {
  // Google Calendar iCal URLs need the basic/ical variant
  // e.g. https://calendar.google.com/calendar/ical/xxx/public/basic.ics
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch calendar: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return parseIcalText(text);
}

/** Parse an uploaded .ics File object. */
export function parseIcalFile(file: File): Promise<IcalImportEvent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(parseIcalText(e.target?.result as string ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
