export const calendarPaths = {
  codexResets: '/codex-resets.ics',
  dtsmEvents: '/dtsm-events.ics'
} as const

export type CalendarPath = (typeof calendarPaths)[keyof typeof calendarPaths]

export const calendarApiPaths = {
  dtsmOptions: '/dtsm-events/options.json'
} as const

export type CalendarApiPath =
  (typeof calendarApiPaths)[keyof typeof calendarApiPaths]

export const dtsmEventFilterParams = {
  scope: 'scope',
  venues: 'venues',
  organizers: 'organizers',
  categories: 'categories'
} as const

export type DtsmEventFilterParam =
  (typeof dtsmEventFilterParams)[keyof typeof dtsmEventFilterParams]

export const dtsmEventScopeValues = {
  all: 'all'
} as const

export const dtsmDefaultVenueIds = [1201, 1249, 1260, 1328, 3999, 1137] as const

export const dtsmBStreetVenues = [
  { id: 1201, name: 'North B Street' },
  { id: 1249, name: 'South B Street' },
  { id: 1260, name: 'B Street between 1st and 2nd avenues' },
  { id: 1328, name: 'B Street between 2nd and 3rd avenues' },
  { id: 3999, name: 'B Street between 1st and 3rd avenues' }
] as const

export const dtsmCentralParkVenue = {
  id: 1137,
  name: 'San Mateo Central Park'
} as const

export interface DtsmFilterOption {
  id: number
  name: string
}

export interface DtsmSemanticChoice {
  key: string
  name: string
  ids: number[]
}

export interface DtsmPlaceGroup extends DtsmSemanticChoice {
  children: DtsmFilterOption[]
}

export interface DtsmFilterModel {
  version: 1
  placeGroups: DtsmPlaceGroup[]
  places: DtsmFilterOption[]
  eventTypes: DtsmSemanticChoice[]
  organizers: DtsmSemanticChoice[]
}

export interface DtsmFilterOptionsResponse {
  defaultVenueIds: number[]
  venues: DtsmFilterOption[]
  organizers: DtsmFilterOption[]
  categories: DtsmFilterOption[]
  filterModel?: DtsmFilterModel
}

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function compareOptionNames(
  left: DtsmFilterOption,
  right: DtsmFilterOption
): number {
  const byName = left.name.localeCompare(right.name, undefined, {
    sensitivity: 'base'
  })
  return byName || left.id - right.id
}

function compareChoiceNames(
  left: DtsmSemanticChoice,
  right: DtsmSemanticChoice
): number {
  const byName = left.name.localeCompare(right.name, undefined, {
    sensitivity: 'base'
  })
  return byName || left.key.localeCompare(right.key)
}

function groupedChoices(
  options: readonly DtsmFilterOption[],
  prefix: string
): DtsmSemanticChoice[] {
  const choices = new Map<string, DtsmSemanticChoice>()
  for (const option of options) {
    const normalized = normalizedName(option.name)
    const existing = choices.get(normalized)
    if (existing) existing.ids.push(option.id)
    else
      choices.set(normalized, {
        key: `${prefix}:${normalized}`,
        name: option.name.trim().replace(/\s+/g, ' '),
        ids: [option.id]
      })
  }
  return [...choices.values()]
    .map(choice => ({
      ...choice,
      ids: [...new Set(choice.ids)].sort((left, right) => left - right)
    }))
    .sort(compareChoiceNames)
}

export function canonicalDtsmCategoryName(name: string): string {
  const normalized = normalizedName(name)
  if (normalized === 'event' || normalized === 'events') return 'Events'
  if (normalized === 'promotion' || normalized === 'promotions')
    return 'Promotions'
  return name.trim().replace(/\s+/g, ' ')
}

export function isDtsmSeriesCategory(name: string): boolean {
  return /^head west \d{4}$/i.test(name.trim())
}

export function normalizeDtsmCategoryNames(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const canonical = canonicalDtsmCategoryName(name)
    const normalized = normalizedName(canonical)
    if (!canonical || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(canonical)
  }
  return result
}

export function normalizeDtsmOrganizerNames(
  names: readonly string[]
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const canonical = name.trim().replace(/\s+/g, ' ')
    const normalized = normalizedName(canonical)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(canonical)
  }
  return result
}

export function buildDtsmFilterModel(options: {
  venues: readonly DtsmFilterOption[]
  organizers: readonly DtsmFilterOption[]
  categories: readonly DtsmFilterOption[]
}): DtsmFilterModel {
  const bStreetIds = new Set<number>(dtsmBStreetVenues.map(option => option.id))
  const activePlaces = options.venues.filter(
    option =>
      !bStreetIds.has(option.id) && option.id !== dtsmCentralParkVenue.id
  )

  const categoryChoices = new Map<string, DtsmSemanticChoice>()
  for (const option of options.categories) {
    if (isDtsmSeriesCategory(option.name)) continue
    const canonical = canonicalDtsmCategoryName(option.name)
    const normalized = normalizedName(canonical)
    const existing = categoryChoices.get(normalized)
    if (existing) existing.ids.push(option.id)
    else
      categoryChoices.set(normalized, {
        key: `event-type:${normalized}`,
        name: canonical,
        ids: [option.id]
      })
  }

  return {
    version: 1,
    placeGroups: [
      {
        key: 'place-group:b-street',
        name: 'B Street',
        ids: dtsmBStreetVenues.map(option => option.id),
        children: dtsmBStreetVenues.map(option => ({ ...option }))
      }
    ],
    places: [
      { ...dtsmCentralParkVenue },
      ...activePlaces.map(option => ({ ...option })).sort(compareOptionNames)
    ],
    eventTypes: [...categoryChoices.values()]
      .map(choice => ({
        ...choice,
        ids: [...new Set(choice.ids)].sort((left, right) => left - right)
      }))
      .sort(compareChoiceNames),
    organizers: groupedChoices(options.organizers, 'organizer')
  }
}

export const codexResetFilterParams = {
  types: 'types'
} as const

export const codexResetTypes = [
  'regular',
  'banked',
  'scheduled',
  'forecast'
] as const

export type CodexResetType = (typeof codexResetTypes)[number]

export const calendarServiceName = 'Calendars'
