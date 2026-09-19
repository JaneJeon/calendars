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

export interface DtsmFilterOption {
  id: number
  name: string
}

export interface DtsmFilterOptionsResponse {
  defaultVenueIds: number[]
  venues: DtsmFilterOption[]
  organizers: DtsmFilterOption[]
  categories: DtsmFilterOption[]
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
