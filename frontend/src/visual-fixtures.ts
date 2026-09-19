import {
  dtsmDefaultVenueIds,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import { currentMonth, shiftMonth, type FeedId } from './calendar'

export const visualOptions: DtsmFilterOptionsResponse = {
  defaultVenueIds: [...dtsmDefaultVenueIds],
  venues: [
    { id: 1201, name: 'North B Street' },
    { id: 1249, name: 'South B Street' },
    { id: 1260, name: 'B Street between 1st and 2nd avenues' },
    { id: 1328, name: 'B Street between 2nd and 3rd avenues' },
    { id: 3999, name: 'B Street between 1st and 3rd avenues' },
    { id: 1137, name: 'San Mateo Central Park' },
    { id: 7777, name: 'A deliberately very long neighborhood venue name' }
  ],
  organizers: [
    { id: 700, name: 'Downtown San Mateo Association' },
    { id: 701, name: 'San Mateo Parks and Recreation' }
  ],
  categories: [
    { id: 80, name: 'Arts & Culture' },
    { id: 81, name: 'Community' },
    { id: 82, name: 'Markets' },
    { id: 83, name: 'Music' }
  ]
}

interface FixtureEvent {
  id: string
  day: number
  title: string
  category: string
  categoryId: number
  venueId: number
  organizerId: number
  location?: string
  month?: string
}

function dateValue(day: number, month: string): string {
  return `${month.replace('-', '')}${String(day).padStart(2, '0')}`
}

function serializeEvent(event: FixtureEvent): string {
  const month = event.month ?? currentMonth()
  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@fixture.test`,
    `SUMMARY:${event.title}`,
    `DTSTART;VALUE=DATE:${dateValue(event.day, month)}`,
    `DTEND;VALUE=DATE:${dateValue(event.day + 1, month)}`,
    'DESCRIPTION:Fixture event used to exercise the real calendar parser and UI.',
    event.location ? `LOCATION:${event.location}` : '',
    event.category ? `CATEGORIES:${event.category}` : '',
    `URL:https://example.com/events/${event.id}`,
    'END:VEVENT'
  ]
    .filter(Boolean)
    .join('\r\n')
}

const dtsmEvents: FixtureEvent[] = [
  {
    id: 'yoga',
    day: 5,
    title: 'Yoga in the Park',
    category: 'Community',
    categoryId: 81,
    venueId: 1137,
    organizerId: 701,
    location: 'Central Park'
  },
  {
    id: 'walk',
    day: 12,
    title: 'Walk, Run, Ride to the Moon',
    category: 'Community',
    categoryId: 81,
    venueId: 1201,
    organizerId: 700,
    location: 'Central Park'
  },
  {
    id: 'market',
    day: 12,
    title: 'Second Saturday Market',
    category: 'Markets',
    categoryId: 82,
    venueId: 1249,
    organizerId: 700,
    location: 'Central Park'
  },
  {
    id: 'music',
    day: 12,
    title: 'Live at the Plaza',
    category: 'Music',
    categoryId: 83,
    venueId: 1260,
    organizerId: 700,
    location: 'Central Park'
  },
  {
    id: 'long',
    day: 12,
    title:
      'A deliberately long event title that proves truncation stays intentional',
    category: 'Arts & Culture',
    categoryId: 80,
    venueId: 1328,
    organizerId: 700,
    location: 'A deliberately very long neighborhood venue name'
  },
  {
    id: 'art',
    day: 19,
    title: 'Kids’ Art Lab',
    category: 'Arts & Culture',
    categoryId: 80,
    venueId: 3999,
    organizerId: 701,
    location: 'Central Park'
  },
  {
    id: 'cleanup',
    day: 26,
    title: 'Neighborhood cleanup',
    category: '',
    categoryId: 80,
    venueId: 1137,
    organizerId: 701,
    location: 'Central Park'
  },
  {
    id: 'next-month',
    day: 5,
    title: 'Next month preview',
    category: 'Community',
    categoryId: 81,
    venueId: 1137,
    organizerId: 701,
    location: 'Central Park',
    month: shiftMonth(currentMonth(), 1)
  },
  {
    id: 'studio',
    day: 27,
    title: 'Open studio afternoon',
    category: 'Arts & Culture',
    categoryId: 80,
    venueId: 7777,
    organizerId: 700,
    location: 'A deliberately very long neighborhood venue name'
  }
]

const codexEvents: FixtureEvent[] = [
  {
    id: 'regular',
    day: 5,
    title: 'Codex Reset',
    category: 'regular',
    categoryId: 0,
    venueId: 0,
    organizerId: 0
  },
  {
    id: 'banked',
    day: 12,
    title: 'Codex Reset (banked)',
    category: 'banked',
    categoryId: 0,
    venueId: 0,
    organizerId: 0
  },
  {
    id: 'forecast',
    day: 21,
    title: 'Codex Reset forecast (elevated, 62%)',
    category: 'forecast',
    categoryId: 0,
    venueId: 0,
    organizerId: 0
  }
]

const defaultVenueIds = new Set<number>(dtsmDefaultVenueIds)

function selectedIds(url: URL, name: string): number[] | null {
  const value = url.searchParams.get(name)
  return value ? value.split(',').map(Number) : null
}

function filteredDtsmEvents(url: URL): FixtureEvent[] {
  const venueIds = selectedIds(url, 'venues')
  const organizerIds = selectedIds(url, 'organizers')
  const categoryIds = selectedIds(url, 'categories')
  const defaultVenues = !url.search && !url.searchParams.has('scope')
  return dtsmEvents.filter(
    event =>
      (venueIds?.includes(event.venueId) ??
        (!defaultVenues || defaultVenueIds.has(event.venueId))) &&
      (organizerIds?.includes(event.organizerId) ?? true) &&
      (categoryIds?.includes(event.categoryId) ?? true)
  )
}

export function visualCalendar(
  scenario: string,
  feed: FeedId,
  feedUrl: string
): string {
  const url = new URL(feedUrl)
  const events =
    scenario === 'empty'
      ? []
      : feed === 'codex'
        ? codexEvents.filter(event => {
            const types = url.searchParams.get('types')?.split(',')
            return !types || types.includes(event.category)
          })
        : filteredDtsmEvents(url)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${feed === 'dtsm' ? 'Downtown San Mateo Events' : 'Codex Resets'}`,
    ...events.map(serializeEvent),
    'END:VCALENDAR',
    ''
  ].join('\r\n')
}
