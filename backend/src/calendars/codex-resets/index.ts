import { UpstreamError } from '@/errors.js'
import { calendarPaths } from '@janejeon/calendars-shared'
import { buildEvents } from './events.js'
import { fetchResets, fetchStatus, type Status } from './upstream.js'
import {
  codexResponseCacheExpirationTtl,
  codexResponseCacheKey,
  filterCodexResetEvents,
  parseCodexResetFilter
} from './query.js'

export default {
  path: calendarPaths.codexResets,
  name: 'Codex Resets',
  cacheTtlSeconds: 15 * 60,
  responseCache: {
    key: codexResponseCacheKey,
    freshnessSeconds: 60 * 60,
    expirationTtlSeconds: codexResponseCacheExpirationTtl
  },

  async buildEvents(_env: Env, request: Request) {
    const { types } = parseCodexResetFilter(new URL(request.url).searchParams)
    let resets
    try {
      resets = await fetchResets()
    } catch (error: unknown) {
      if (error instanceof UpstreamError && error.status === 429) {
        console.error('resets rate limited', { retryAfter: error.retryAfter })
      } else {
        console.error('resets fetch failed', error)
      }
      throw error instanceof UpstreamError
        ? error
        : new UpstreamError('resets fetch failed')
    }

    let status: Status = {}
    try {
      status = await fetchStatus()
    } catch (error: unknown) {
      console.warn('status fetch failed, serving history-only feed', error)
    }

    return filterCodexResetEvents(buildEvents(resets, status), types)
  }
}
