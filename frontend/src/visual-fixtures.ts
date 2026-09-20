import {
  buildDtsmFilterModel,
  dtsmDefaultVenueIds,
  type DtsmFilterOption,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import { currentMonth, shiftMonth, type FeedId } from './calendar'

const visualVenues: DtsmFilterOption[] = [
  { id: 6373, name: 'Aikido By The Bay' },
  { id: 1249, name: 'South B Street' },
  { id: 1260, name: 'B Street between 1st and 2nd avenues' },
  { id: 3999, name: 'B Street between 1st and 3rd avenues' },
  { id: 2027, name: 'Baking Arts' },
  { id: 5507, name: 'Blue Moon Bar' },
  { id: 3439, name: 'Chill Spot Rendezvous' },
  { id: 5559, name: 'Christian Science Reading Room San Mateo' },
  { id: 2189, name: 'Cinemark Century San Mateo 12' },
  { id: 3315, name: 'Downtown San Mateo Fire Dept #21' },
  { id: 1217, name: 'Fogbird' },
  { id: 2073, name: 'McGoverns' },
  { id: 1480, name: 'Motion Arts Center' },
  { id: 1719, name: 'Nandi Yoga' },
  { id: 1774, name: 'O’Neill’s Irish Pub' },
  { id: 1238, name: 'Peninsula Italian American Social Club' },
  { id: 4211, name: 'Porterhouse' },
  { id: 3068, name: 'Rise Woodfire' },
  { id: 1137, name: 'San Mateo Central Park' },
  { id: 1213, name: 'San Mateo Public Library (Main)' },
  { id: 6441, name: 'Sutter Medical Center San Mateo' },
  { id: 5000, name: 'Taqueria La Cumbre' },
  { id: 4799, name: 'Tree of Life Healing Center for the Soul' },
  { id: 2453, name: 'Y Salon Spa' }
]

const visualOrganizers: DtsmFilterOption[] = [
  { id: 2377, name: 'Amici’s' },
  { id: 2028, name: 'Baking Arts' },
  { id: 6442, name: 'Bay Area Community Health Advisory Council' },
  { id: 6261, name: 'Christian Science Reading Room' },
  { id: 1138, name: 'City of San Mateo' },
  { id: 712, name: 'Downtown San Mateo Association' },
  { id: 1218, name: 'Fogbird' },
  { id: 3229, name: 'HEAD WEST Marketplace' },
  { id: 6273, name: 'Line Dancing Lisa' },
  { id: 2074, name: 'McGoverns' },
  { id: 1483, name: 'Motion Arts Center' },
  { id: 1720, name: 'Nandi Yoga' },
  { id: 1775, name: 'O’Neill’s Irish Pub' },
  { id: 1239, name: 'Peninsula Italian American Social Club' },
  { id: 6047, name: 'Porter House' },
  { id: 6428, name: 'Rise Woodfire' },
  { id: 1320, name: 'San Mateo Area Chamber of Commerce' },
  { id: 2264, name: 'San Mateo County Office of Arts and Culture' },
  { id: 1167, name: 'San Mateo Firefighters Association' },
  { id: 2534, name: 'Self Help for the Elderly' },
  { id: 6061, name: 'Taqueria La Cumbre' },
  { id: 6364, name: 'The Cozy Coloring Club' },
  { id: 6280, name: 'WellAware AI' }
]

const visualCategories: DtsmFilterOption[] = [
  { id: 25, name: 'Event' },
  { id: 15, name: 'Events' },
  { id: 24, name: 'Head West 2026' },
  { id: 26, name: 'Promotion' },
  { id: 14, name: 'Promotions' }
]

export const visualOptions: DtsmFilterOptionsResponse = {
  defaultVenueIds: [...dtsmDefaultVenueIds],
  venues: visualVenues,
  organizers: visualOrganizers,
  categories: visualCategories,
  filterModel: buildDtsmFilterModel({
    venues: visualVenues,
    organizers: visualOrganizers,
    categories: visualCategories
  })
}

interface FixtureEvent {
  id: string
  day: number
  title: string
  categories: string[]
  categoryIds: number[]
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
    event.categories.length > 0
      ? `CATEGORIES:${event.categories.join(',')}`
      : '',
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
    categories: ['Events'],
    categoryIds: [15],
    venueId: 1137,
    organizerId: 1138,
    location: 'Central Park'
  },
  {
    id: 'walk',
    day: 12,
    title: 'Walk, Run, Ride to the Moon',
    categories: ['Events'],
    categoryIds: [25],
    venueId: 1201,
    organizerId: 712,
    location: 'Central Park'
  },
  {
    id: 'market',
    day: 12,
    title: 'Second Saturday Market',
    categories: ['Events', 'Head West 2026'],
    categoryIds: [15, 24],
    venueId: 1249,
    organizerId: 3229,
    location: 'Central Park'
  },
  {
    id: 'music',
    day: 12,
    title: 'Live at the Plaza',
    categories: ['Events'],
    categoryIds: [15],
    venueId: 1260,
    organizerId: 712,
    location: 'Central Park'
  },
  {
    id: 'long',
    day: 12,
    title:
      'A deliberately long event title that proves truncation stays intentional',
    categories: ['Promotions'],
    categoryIds: [14],
    venueId: 1328,
    organizerId: 6442,
    location: 'Sutter Medical Center San Mateo'
  },
  {
    id: 'art',
    day: 19,
    title: 'Kids’ Art Lab',
    categories: ['Promotions'],
    categoryIds: [26],
    venueId: 3999,
    organizerId: 712,
    location: 'Central Park'
  },
  {
    id: 'cleanup',
    day: 26,
    title: 'Neighborhood cleanup',
    categories: [],
    categoryIds: [15],
    venueId: 1137,
    organizerId: 6364,
    location: 'Central Park'
  },
  {
    id: 'next-month',
    day: 5,
    title: 'Next month preview',
    categories: ['Events'],
    categoryIds: [15],
    venueId: 1137,
    organizerId: 712,
    location: 'Central Park',
    month: shiftMonth(currentMonth(), 1)
  },
  {
    id: 'studio',
    day: 27,
    title: 'Open studio afternoon',
    categories: ['Promotions'],
    categoryIds: [14],
    venueId: 6441,
    organizerId: 6442,
    location: 'Sutter Medical Center San Mateo'
  }
]

const codexEvents: FixtureEvent[] = [
  {
    id: 'regular',
    day: 5,
    title: 'Codex Reset',
    categories: ['regular'],
    categoryIds: [0],
    venueId: 0,
    organizerId: 0
  },
  {
    id: 'banked',
    day: 12,
    title: 'Codex Reset (banked)',
    categories: ['banked'],
    categoryIds: [0],
    venueId: 0,
    organizerId: 0
  },
  {
    id: 'forecast',
    day: 21,
    title: 'Codex Reset forecast (elevated, 62%)',
    categories: ['forecast'],
    categoryIds: [0],
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
      (categoryIds?.some(id => event.categoryIds.includes(id)) ?? true)
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
            return !types || types.includes(event.categories[0]!)
          })
        : filteredDtsmEvents(url).filter(
            event => scenario !== 'long' || event.id === 'long'
          )
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
