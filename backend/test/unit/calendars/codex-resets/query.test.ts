import { describe, expect, it } from 'vitest'
import { InvalidRequestError } from '@/errors.js'
import type { CalendarEvent } from '@/lib/ics.js'
import {
  CUSTOM_CODEX_CACHE_RETENTION_SECONDS,
  codexResponseCacheExpirationTtl,
  codexResponseCacheKey,
  filterCodexResetEvents,
  parseCodexResetFilter
} from '@/calendars/codex-resets/query.js'

function parse(query = '') {
  return parseCodexResetFilter(new URLSearchParams(query))
}

describe('Codex reset query filters', () => {
  it('treats an omitted or complete filter as the stable base feed', () => {
    const all = ['regular', 'banked', 'scheduled', 'forecast']
    expect(parse()).toEqual({ types: all, canonicalQuery: '' })
    expect(parse('types=forecast,regular,banked,scheduled,regular')).toEqual({
      types: all,
      canonicalQuery: ''
    })
  })

  it('canonicalizes subsets and filters by event category', () => {
    expect(parse('types=forecast,%20regular,forecast')).toEqual({
      types: ['regular', 'forecast'],
      canonicalQuery: 'types=regular,forecast'
    })
    const events = [
      { uid: 'regular', categories: ['regular'] },
      { uid: 'forecast', categories: ['forecast'] },
      { uid: 'mixed', categories: ['unknown', 'regular'] },
      { uid: 'unknown', categories: ['unknown'] },
      { uid: 'none' }
    ] as CalendarEvent[]
    expect(
      filterCodexResetEvents(events, ['forecast']).map(event => event.uid)
    ).toEqual(['forecast'])
    expect(
      filterCodexResetEvents(events, ['regular']).map(event => event.uid)
    ).toEqual(['regular', 'mixed'])
    expect(
      filterCodexResetEvents(events, [
        'regular',
        'banked',
        'scheduled',
        'forecast'
      ]).map(event => event.uid)
    ).toEqual(['regular', 'forecast', 'mixed', 'unknown', 'none'])
  })

  it.each([
    ['unknown parameter', 'type=regular'],
    ['empty list', 'types='],
    ['empty item', 'types=regular,'],
    ['repeated parameter', 'types=regular&types=banked'],
    ['unknown type', 'types=full']
  ])('rejects %s', (_label, query) => {
    expect(() => parse(query)).toThrow(InvalidRequestError)
  })

  it('uses a stable base key and canonical custom hashes', async () => {
    const base = new Request('https://example.com/codex-resets.ics')
    const subset = new Request(
      'https://example.com/codex-resets.ics?types=forecast,regular'
    )
    const equivalent = new Request(
      'https://example.com/codex-resets.ics?types=regular,forecast,regular'
    )
    expect(await codexResponseCacheKey(base)).toBe('codex-resets.ics')
    expect(await codexResponseCacheKey(subset)).toMatch(
      /^codex-resets\.ics:[a-f0-9]{64}$/
    )
    expect(await codexResponseCacheKey(equivalent)).toBe(
      await codexResponseCacheKey(subset)
    )
    expect(codexResponseCacheExpirationTtl(base)).toBeUndefined()
    expect(codexResponseCacheExpirationTtl(subset)).toBe(
      CUSTOM_CODEX_CACHE_RETENTION_SECONDS
    )
  })
})
