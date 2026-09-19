import ICAL from 'ical.js'
import type { EventTone } from './theme'

export type FeedId = 'dtsm' | 'codex'
export type ViewId = 'grid' | 'list'

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export interface CalendarEvent {
  uid: string
  calendar: FeedId
  title: string
  start: Date | CalendarDate
  end: Date | CalendarDate
  allDay: boolean
  description?: string
  location?: string
  categories: string[]
  url?: string
}

export interface EventProjection {
  key: string
  dateKey: string
  event: CalendarEvent
  timeLabel: string
  tone: EventTone
}

export const TIME_ZONE = 'America/Los_Angeles'

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit'
})
const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
})
const detailDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

function optional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  return trimmed || undefined
}

function propertyStrings(
  component: InstanceType<typeof ICAL.Component>,
  name: string
) {
  return component
    .getAllProperties(name)
    .flatMap(property => property.getValues())
    .map(String)
    .filter(Boolean)
}

export function parseCalendar(
  source: string,
  calendar: FeedId
): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(source))
  return root.getAllSubcomponents('vevent').map(component => {
    const event = new ICAL.Event(component)
    const allDay = event.startDate.isDate
    const start: Date | CalendarDate = allDay
      ? {
          year: event.startDate.year,
          month: event.startDate.month,
          day: event.startDate.day
        }
      : event.startDate.toJSDate()
    const end: Date | CalendarDate = allDay
      ? {
          year: event.endDate.year,
          month: event.endDate.month,
          day: event.endDate.day
        }
      : event.endDate.toJSDate()
    const rawUrl = component.getFirstPropertyValue('url')
    return {
      uid: event.uid,
      calendar,
      title: event.summary || 'Untitled event',
      start,
      end,
      allDay,
      description: optional(event.description),
      location: optional(event.location),
      categories: propertyStrings(component, 'categories'),
      url: typeof rawUrl === 'string' ? optional(rawUrl) : undefined
    }
  })
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function dateKey(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

export function dateFromKey(key: string): CalendarDate {
  const [year, month, day] = key.split('-').map(Number)
  return { year: year!, month: month!, day: day! }
}

function dateFromInstant(date: Date): CalendarDate {
  const parts = Object.fromEntries(
    dayFormatter.formatToParts(date).map(part => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  }
}

function utcDate(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

export function addDateDays(date: CalendarDate, days: number): CalendarDate {
  const result = utcDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate()
  }
}

function coveredDates(event: CalendarEvent): CalendarDate[] {
  const start = event.allDay
    ? (event.start as CalendarDate)
    : dateFromInstant(event.start as Date)
  const exclusiveEnd = event.allDay
    ? (event.end as CalendarDate)
    : dateFromInstant(
        new Date(
          Math.max(
            (event.start as Date).getTime(),
            (event.end as Date).getTime() - 1
          )
        )
      )
  const result: CalendarDate[] = []
  for (let cursor = start; ; cursor = addDateDays(cursor, 1)) {
    result.push(cursor)
    if (
      event.allDay
        ? dateKey(addDateDays(cursor, 1)) >= dateKey(exclusiveEnd)
        : dateKey(cursor) >= dateKey(exclusiveEnd)
    )
      return result
  }
}

export function eventToneFor(event: CalendarEvent): EventTone {
  const category =
    event.categories[0]?.toLowerCase() ?? event.title.toLowerCase()
  const known: Record<string, EventTone> = {
    regular: 'community',
    banked: 'market',
    scheduled: 'music',
    forecast: 'arts',
    community: 'community',
    markets: 'market',
    music: 'music',
    'arts & culture': 'arts'
  }
  if (known[category]) return known[category]
  const tones: EventTone[] = ['community', 'market', 'music', 'arts']
  const hash = [...category].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  )
  return tones[hash % tones.length]!
}

export function projectEvents(events: CalendarEvent[]): EventProjection[] {
  return events.flatMap(event =>
    coveredDates(event).map((date, index) => ({
      key: `${event.uid}@${dateKey(date)}`,
      dateKey: dateKey(date),
      event,
      timeLabel:
        index > 0
          ? 'Continues'
          : event.allDay
            ? 'All day'
            : timeFormatter.format(event.start as Date),
      tone: eventToneFor(event)
    }))
  )
}

export function projectionsForMonth(
  events: CalendarEvent[],
  month: string
): EventProjection[] {
  return projectEvents(events)
    .filter(projection => projection.dateKey.startsWith(`${month}-`))
    .sort((left, right) => {
      const date = left.dateKey.localeCompare(right.dateKey)
      if (date !== 0) return date
      if (left.event.allDay !== right.event.allDay)
        return left.event.allDay ? -1 : 1
      const start =
        left.event.start instanceof Date ? left.event.start.getTime() : 0
      const otherStart =
        right.event.start instanceof Date ? right.event.start.getTime() : 0
      return (
        start - otherStart || left.event.title.localeCompare(right.event.title)
      )
    })
}

export function currentMonth(now = new Date()): string {
  const date = dateFromInstant(now)
  return `${date.year}-${pad(date.month)}`
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year!, monthNumber! - 1, 1)))
}

export function monthGrid(month: string): CalendarDate[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year!, monthNumber! - 1, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate()
    }
  })
}

export function fullDate(key: string): string {
  return fullDateFormatter.format(utcDate(dateFromKey(key)))
}

export function shortWeekday(key: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC'
  }).format(utcDate(dateFromKey(key)))
}

export function eventDetailTime(event: CalendarEvent): string {
  if (!event.allDay) {
    const start = event.start as Date
    const end = event.end as Date
    const sameDay =
      dateKey(dateFromInstant(start)) === dateKey(dateFromInstant(end))
    return sameDay
      ? `${detailDateTimeFormatter.format(start)} to ${timeFormatter.format(end)}`
      : `${detailDateTimeFormatter.format(start)} to ${detailDateTimeFormatter.format(end)}`
  }
  const start = event.start as CalendarDate
  const inclusiveEnd = addDateDays(event.end as CalendarDate, -1)
  return dateKey(start) === dateKey(inclusiveEnd)
    ? `${fullDate(dateKey(start))} · All day`
    : `${fullDate(dateKey(start))} through ${fullDate(dateKey(inclusiveEnd))} · All day`
}
