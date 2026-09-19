import {
  calendarApiPaths,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import { parseCalendar, type CalendarEvent, type FeedId } from './calendar'

export function calendarApiOrigin(isDevelopment: boolean): string {
  return isDevelopment ? 'http://localhost:8787' : 'https://cal.janejeon.dev'
}

export const CALENDAR_API_ORIGIN = calendarApiOrigin(import.meta.env.DEV)

export class CalendarRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

async function responseError(response: Response): Promise<never> {
  const detail = (await response.text()).trim()
  throw new CalendarRequestError(
    detail || `Calendar service returned ${response.status}`,
    response.status
  )
}

export async function fetchDtsmOptions(
  signal?: AbortSignal,
  request: typeof fetch = fetch
): Promise<DtsmFilterOptionsResponse> {
  /* istanbul ignore else -- Vite removes this entire fixture branch in production. */
  if (import.meta.env.DEV) {
    const scenario = new URLSearchParams(window.location.search).get(
      '__scenario'
    )
    if (scenario === 'options-error')
      throw new CalendarRequestError('Fixture options request failed', 503)
    if (scenario) {
      const moduleUrl = '/src/visual-fixtures.ts'
      const fixtures = (await import(
        /* @vite-ignore */ moduleUrl
      )) as typeof import('./visual-fixtures')
      return fixtures.visualOptions
    }
  }

  const response = await request(
    new URL(calendarApiPaths.dtsmOptions, CALENDAR_API_ORIGIN),
    { signal }
  )
  if (!response.ok) return responseError(response)
  return (await response.json()) as DtsmFilterOptionsResponse
}

export async function fetchCalendar(
  url: string,
  feed: FeedId,
  signal?: AbortSignal,
  request: typeof fetch = fetch
): Promise<CalendarEvent[]> {
  /* istanbul ignore else -- Vite removes this entire fixture branch in production. */
  if (import.meta.env.DEV) {
    const scenario = new URLSearchParams(window.location.search).get(
      '__scenario'
    )
    if (scenario === 'feed-error')
      throw new CalendarRequestError('Fixture calendar request failed', 503)
    if (scenario) {
      const moduleUrl = '/src/visual-fixtures.ts'
      const { visualCalendar } = (await import(
        /* @vite-ignore */ moduleUrl
      )) as typeof import('./visual-fixtures')
      return parseCalendar(visualCalendar(scenario, feed, url), feed)
    }
  }

  const response = await request(url, { signal })
  if (!response.ok) return responseError(response)
  return parseCalendar(await response.text(), feed)
}

export function feedStaleTime(feed: FeedId): number {
  return (feed === 'dtsm' ? 60 * 60 : 15 * 60) * 1000
}
