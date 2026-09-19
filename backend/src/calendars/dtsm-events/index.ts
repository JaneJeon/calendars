import { UpstreamError } from '@/errors.js'
import { calendarPaths } from '@janejeon/calendars-shared'
import { buildEvents, decodeEntities } from './events.js'
import {
  acquireLease,
  persistSnapshot,
  readEvents,
  readFilterOptions,
  readOngoingStart,
  readSyncState,
  recordFailure
} from './repository.js'
import {
  DEFAULT_DTSM_VENUE_IDS,
  dtsmResponseCacheExpirationTtl,
  dtsmResponseCacheKey,
  parseDtsmEventFilter
} from './query.js'
import { fetchEvents } from './upstream.js'

const TIME_ZONE = 'America/Los_Angeles'

export function localDateTime(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(now)
      .map(part => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

export async function syncCatalog(db: D1Database, now: Date): Promise<void> {
  const nowSeconds = Math.floor(now.getTime() / 1000)
  const state = await readSyncState(db)
  if (state.next_attempt_at > nowSeconds) {
    if (state.last_success_at === null)
      throw new UpstreamError('DTSM events refresh is waiting to retry')
    return
  }

  if (!(await acquireLease(db, nowSeconds))) {
    if (state.last_success_at !== null) return
    throw new UpstreamError('DTSM events refresh is already in progress')
  }

  const currentLocal = localDateTime(now)
  const ongoingStart = await readOngoingStart(db, currentLocal)
  const today = currentLocal.slice(0, 10)

  try {
    const sourceEvents = await fetchEvents({
      startDate: ongoingStart?.slice(0, 10) ?? today
    })
    if (sourceEvents.length === 0)
      throw new UpstreamError('DTSM events returned an empty snapshot')
    await persistSnapshot(db, sourceEvents, nowSeconds, currentLocal)
  } catch (error: unknown) {
    await recordFailure(db, nowSeconds, state.last_success_at !== null)
    if (state.last_success_at !== null) {
      console.warn('DTSM events refresh failed, serving stored events', error)
      return
    }
    throw error instanceof UpstreamError
      ? error
      : new UpstreamError('DTSM events refresh failed')
  }
}

export async function buildDtsmFilterOptions(env: Env) {
  try {
    await syncCatalog(env.CALENDAR_DB, new Date())
    const options = await readFilterOptions(env.CALENDAR_DB)
    const decoded = (values: typeof options.venues) =>
      values.map(value => ({ ...value, name: decodeEntities(value.name) }))
    return {
      defaultVenueIds: [...DEFAULT_DTSM_VENUE_IDS],
      venues: decoded(options.venues),
      organizers: decoded(options.organizers),
      categories: decoded(options.categories)
    }
  } catch (error: unknown) {
    if (error instanceof UpstreamError) throw error
    throw new UpstreamError('DTSM database unavailable')
  }
}

export default {
  path: calendarPaths.dtsmEvents,
  name: 'Downtown San Mateo Events',
  cacheTtlSeconds: 60 * 60,
  responseCache: {
    key: dtsmResponseCacheKey,
    freshnessSeconds: 60 * 60,
    expirationTtlSeconds: dtsmResponseCacheExpirationTtl
  },

  async buildEvents(env: Env, request: Request) {
    const { filter } = parseDtsmEventFilter(new URL(request.url).searchParams)
    try {
      await syncCatalog(env.CALENDAR_DB, new Date())
      return buildEvents(await readEvents(env.CALENDAR_DB, filter))
    } catch (error: unknown) {
      if (error instanceof UpstreamError) throw error
      throw new UpstreamError('DTSM database unavailable')
    }
  }
}
