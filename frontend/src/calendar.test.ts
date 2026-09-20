import { describe, expect, it } from 'vitest'
import {
  addDateDays,
  currentMonth,
  dateFromKey,
  dateKey,
  eventDetailTime,
  eventToneFor,
  fullDate,
  monthGrid,
  monthLabel,
  parseCalendar,
  projectEvents,
  projectionsForMonth,
  shiftMonth,
  shortWeekday,
  type CalendarEvent
} from './calendar'

const source = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:all-day\r
SUMMARY:Festival\r
DTSTART;VALUE=DATE:20260912\r
DTEND;VALUE=DATE:20260914\r
DESCRIPTION:Two days\r
LOCATION:Central Park\r
CATEGORIES:Arts\r
URL:https://example.com/festival\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:timed\r
SUMMARY:Late show\r
DTSTART:20260913T063000Z\r
DTEND:20260913T083000Z\r
CATEGORIES:scheduled\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:bare\r
DTSTART;VALUE=DATE:20260920\r
DTEND;VALUE=DATE:20260921\r
END:VEVENT\r
END:VCALENDAR\r
`

function requireTimed(
  event: CalendarEvent | undefined
): Extract<CalendarEvent, { allDay: false }> {
  if (!event || event.allDay) throw new Error('expected a timed event')
  return event
}

describe('calendar model', () => {
  it('parses timed, all-day, and optional event fields', () => {
    const events = parseCalendar(source, 'dtsm')
    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({
      uid: 'all-day',
      title: 'Festival',
      allDay: true,
      start: { year: 2026, month: 9, day: 12 },
      end: { year: 2026, month: 9, day: 14 },
      description: 'Two days',
      location: 'Central Park',
      categories: ['Arts'],
      url: 'https://example.com/festival'
    })
    expect(events[1]!.start).toBeInstanceOf(Date)
    expect(events[2]).toMatchObject({
      title: 'Untitled event',
      categories: []
    })
    expect(events[2]!.description).toBeUndefined()
    expect(events[2]!.location).toBeUndefined()
    expect(events[2]!.url).toBeUndefined()
  })

  it('projects multi-day events onto each covered LA date', () => {
    const events = parseCalendar(source, 'dtsm')
    const projections = projectEvents(events)
    expect(
      projections
        .filter(item => item.event.uid === 'all-day')
        .map(item => [item.dateKey, item.timeLabel])
    ).toEqual([
      ['2026-09-12', 'All day'],
      ['2026-09-13', 'Continues']
    ])
    expect(
      projections
        .filter(item => item.event.uid === 'timed')
        .map(item => [item.dateKey, item.timeLabel])
    ).toEqual([
      ['2026-09-12', '11:30 PM'],
      ['2026-09-13', 'Continues']
    ])
    expect(projectionsForMonth(events, '2026-10')).toEqual([])
    expect(projectionsForMonth(events, '2026-09')[0]!.event.allDay).toBe(true)
  })

  it('bounds projection work to the requested month for extreme spans', () => {
    const [event] = parseCalendar(
      `BEGIN:VCALENDAR\r
BEGIN:VEVENT\r
UID:millennium\r
SUMMARY:Long span\r
DTSTART;VALUE=DATE:20200101\r
DTEND;VALUE=DATE:30260101\r
END:VEVENT\r
END:VCALENDAR\r
`,
      'dtsm'
    )
    const projections = projectionsForMonth([event!], '2026-09')
    expect(projections).toHaveLength(30)
    expect(projections[0]).toMatchObject({
      dateKey: '2026-09-01',
      timeLabel: 'Continues'
    })
    expect(projections[29]!.dateKey).toBe('2026-09-30')
  })

  it('rejects floating timed values instead of applying the viewer timezone', () => {
    expect(() =>
      parseCalendar(
        `BEGIN:VCALENDAR\r
BEGIN:VEVENT\r
UID:floating\r
SUMMARY:Floating\r
DTSTART:20260912T120000\r
DTEND:20260912T130000\r
END:VEVENT\r
END:VCALENDAR\r
`,
        'dtsm'
      )
    ).toThrow('Timed calendar events must include a timezone')
  })

  it('delegates folding, escaping, unicode, and category lists to ical.js', () => {
    const [event] = parseCalendar(
      `BEGIN:VCALENDAR\r
BEGIN:VEVENT\r
UID:escaped\r
SUMMARY:Café and a deliberately folded \r
 title\r
DTSTART;VALUE=DATE:20260912\r
DTEND;VALUE=DATE:20260913\r
DESCRIPTION:Line one\\nLine two\\, still here\\; yes\r
CATEGORIES:Arts\\, Culture,Community\r
END:VEVENT\r
END:VCALENDAR\r
`,
      'dtsm'
    )
    expect(event).toMatchObject({
      title: 'Café and a deliberately folded title',
      description: 'Line one\nLine two, still here; yes',
      categories: ['Arts, Culture', 'Community']
    })
  })

  it('formats date utilities and month boundaries', () => {
    expect(dateKey({ year: 2026, month: 9, day: 2 })).toBe('2026-09-02')
    expect(dateFromKey('2026-09-02')).toEqual({ year: 2026, month: 9, day: 2 })
    expect(addDateDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1
    })
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(monthLabel('2026-09')).toBe('September 2026')
    expect(monthGrid('2026-09')).toHaveLength(42)
    expect(dateKey(monthGrid('2026-09')[0]!)).toBe('2026-08-30')
    expect(fullDate('2026-09-12')).toContain('Saturday')
    expect(shortWeekday('2026-09-12')).toBe('Sat')
    expect(currentMonth(new Date('2026-09-12T12:00:00Z'))).toBe('2026-09')
  })

  it('formats event details and stable semantic tones', () => {
    const [allDay, parsedTimed, bare] = parseCalendar(source, 'dtsm')
    const timed = requireTimed(parsedTimed)
    expect(eventDetailTime(allDay!)).toContain('through')
    expect(eventDetailTime(bare!)).toContain('All day')
    expect(eventDetailTime(timed!)).toContain('to')
    const sameDayTimed = {
      ...timed!,
      start: new Date('2026-09-12T17:00:00Z'),
      end: new Date('2026-09-12T18:00:00Z')
    }
    expect(eventDetailTime(sameDayTimed)).toContain('to 11:00 AM')
    expect(eventToneFor(timed!)).toBe('music')
    const banked = { ...timed!, categories: ['banked'] }
    expect(eventToneFor(banked)).toBe('market')
    const regular = { ...timed!, categories: ['regular'] }
    expect(eventToneFor(regular)).toBe('community')
    const forecast = { ...timed!, categories: ['forecast'] }
    expect(eventToneFor(forecast)).toBe('arts')
    expect(eventToneFor({ ...timed!, categories: ['Community'] })).toBe(
      'community'
    )
    expect(eventToneFor({ ...timed!, categories: ['Markets'] })).toBe('market')
    expect(eventToneFor({ ...timed!, categories: ['Music'] })).toBe('music')
    expect(eventToneFor({ ...timed!, categories: ['Arts & Culture'] })).toBe(
      'arts'
    )
    expect(
      eventToneFor({
        ...timed!,
        categories: [],
        title: 'Fallback'
      } as CalendarEvent)
    ).toMatch(/community|market|music|arts/)
  })

  it('sorts projections by day, all-day status, time, and title', () => {
    const [allDay, parsedTimed] = parseCalendar(source, 'dtsm')
    const timed = requireTimed(parsedTimed)
    const early = {
      ...timed,
      uid: 'early-z',
      title: 'Zulu',
      start: new Date('2026-09-12T17:00:00Z'),
      end: new Date('2026-09-12T18:00:00Z')
    }
    const earlyAlphabetical = { ...early, uid: 'early-a', title: 'Alpha' }
    const late = {
      ...early,
      uid: 'late',
      title: 'Late',
      start: new Date('2026-09-12T19:00:00Z'),
      end: new Date('2026-09-12T20:00:00Z')
    }
    expect(
      projectionsForMonth(
        [late, early, allDay!, earlyAlphabetical],
        '2026-09'
      ).map(item => item.event.uid)
    ).toEqual(['all-day', 'early-a', 'early-z', 'late', 'all-day'])
  })
})
