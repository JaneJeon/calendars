import { describe, expect, it, vi } from 'vitest'
import {
  codexResetTypes,
  dtsmDefaultVenueIds
} from '@janejeon/calendars-shared'
import {
  MAX_PERSISTED_SELECTION_IDS,
  STORAGE_KEY,
  buildCodexFeedPath,
  buildDtsmFeedPath,
  buildFeedUrl,
  defaultExplorerState,
  readExplorerState,
  reconcileDtsmFilters,
  reconcileExplorerState,
  selectionSummary,
  sortFilterOptions,
  toggleId,
  writeExplorerState
} from './filters'

const options = {
  defaultVenueIds: [...dtsmDefaultVenueIds],
  venues: [
    ...dtsmDefaultVenueIds.map(id => ({ id, name: String(id) })),
    { id: 9000, name: 'Other' }
  ],
  organizers: [{ id: 700, name: 'Host' }],
  categories: [{ id: 80, name: 'Type' }]
}

describe('explorer filters and persistence', () => {
  it('builds defaults for each responsive starting view', () => {
    expect(
      defaultExplorerState(false, new Date('2026-09-12T12:00:00Z'))
    ).toMatchObject({
      feed: 'dtsm',
      view: 'grid',
      month: '2026-09'
    })
    expect(defaultExplorerState(true).view).toBe('list')
  })

  it('reads valid fields independently and canonicalizes selections', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          feed: 'codex',
          view: 'list',
          month: '2026-11',
          filters: {
            dtsm: {
              venueIds: [9001, 9000, 9000],
              organizerIds: null,
              categoryIds: []
            },
            codex: { types: ['forecast', 'regular', 'forecast'] }
          }
        })
    }
    expect(readExplorerState(storage, false)).toMatchObject({
      feed: 'codex',
      view: 'list',
      month: '2026-11',
      filters: {
        dtsm: {
          venueIds: [9000, 9001],
          organizerIds: null,
          categoryIds: []
        },
        codex: { types: ['regular', 'forecast'] }
      }
    })
  })

  it('falls back for absent, malformed, or unreadable storage fields', () => {
    const absent = { getItem: () => null }
    expect(readExplorerState(absent, false).feed).toBe('dtsm')
    expect(readExplorerState({ getItem: () => 'null' }, false).feed).toBe(
      'dtsm'
    )
    expect(readExplorerState({ getItem: () => '{' }, false).feed).toBe('dtsm')
    expect(
      readExplorerState(
        {
          getItem: () => {
            throw new Error('blocked')
          }
        },
        true
      ).view
    ).toBe('list')
    const invalid = readExplorerState(
      {
        getItem: () =>
          JSON.stringify({
            feed: 'nope',
            view: 'nope',
            month: '2026-13',
            filters: {
              dtsm: {
                venueIds: ['bad'],
                organizerIds: [-1],
                categoryIds: 'bad'
              },
              codex: { types: ['full'] }
            }
          })
      },
      false,
      new Date('2026-09-12T12:00:00Z')
    )
    expect(invalid).toEqual(
      defaultExplorerState(false, new Date('2026-09-12T12:00:00Z'))
    )
    expect(
      readExplorerState(
        {
          getItem: () =>
            JSON.stringify({
              month: 202609,
              filters: { dtsm: {}, codex: { types: 'regular' } }
            })
        },
        false,
        new Date('2026-09-12T12:00:00Z')
      )
    ).toEqual(defaultExplorerState(false, new Date('2026-09-12T12:00:00Z')))
    expect(
      readExplorerState(
        {
          getItem: () =>
            JSON.stringify({
              filters: {
                dtsm: {
                  venueIds: Array.from(
                    { length: MAX_PERSISTED_SELECTION_IDS + 1 },
                    (_, index) => index + 1
                  )
                }
              }
            })
        },
        false,
        new Date('2026-09-12T12:00:00Z')
      ).filters.dtsm.venueIds
    ).toEqual([...dtsmDefaultVenueIds])
    expect(
      readExplorerState(
        { getItem: () => JSON.stringify({ filters: null }) },
        false,
        new Date('2026-09-12T12:00:00Z')
      )
    ).toEqual(defaultExplorerState(false, new Date('2026-09-12T12:00:00Z')))
  })

  it('writes state or reports a storage failure', () => {
    const setItem = vi.fn()
    const state = defaultExplorerState(false)
    expect(writeExplorerState({ setItem }, state)).toBe(true)
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state))
    expect(
      writeExplorerState(
        {
          setItem: () => {
            throw new Error('quota')
          }
        },
        state
      )
    ).toBe(false)
  })

  it('reconciles stale IDs without turning an intentional empty into a default', () => {
    expect(
      reconcileDtsmFilters(
        { venueIds: [999], organizerIds: [999], categoryIds: [] },
        options
      )
    ).toEqual({
      venueIds: [...dtsmDefaultVenueIds],
      organizerIds: null,
      categoryIds: []
    })
    expect(
      reconcileDtsmFilters(
        { venueIds: null, organizerIds: [700, 999], categoryIds: null },
        options
      )
    ).toEqual({ venueIds: null, organizerIds: [700], categoryIds: null })
    expect(
      reconcileDtsmFilters(
        { venueIds: [999], organizerIds: [998], categoryIds: [997] },
        {
          defaultVenueIds: [...dtsmDefaultVenueIds],
          venues: [],
          organizers: [],
          categories: []
        }
      )
    ).toEqual({ venueIds: [999], organizerIds: [998], categoryIds: [997] })
  })

  it('derives a reconciled explorer state whenever discovery is available', () => {
    const state = {
      ...defaultExplorerState(false, new Date('2026-09-12T12:00:00Z')),
      filters: {
        ...defaultExplorerState(false).filters,
        dtsm: {
          venueIds: [999],
          organizerIds: [700, 999],
          categoryIds: []
        }
      }
    }
    expect(reconcileExplorerState(state)).toBe(state)
    expect(reconcileExplorerState(state, options)).toMatchObject({
      month: '2026-09',
      filters: {
        dtsm: {
          venueIds: [...dtsmDefaultVenueIds],
          organizerIds: [700],
          categoryIds: []
        }
      }
    })
  })

  it('builds canonical DTSM URLs for default, unrestricted, subset, and empty states', () => {
    expect(
      buildDtsmFeedPath({
        venueIds: [...dtsmDefaultVenueIds],
        organizerIds: null,
        categoryIds: null
      })
    ).toBe('/dtsm-events.ics')
    expect(
      buildDtsmFeedPath({
        venueIds: null,
        organizerIds: null,
        categoryIds: null
      })
    ).toBe('/dtsm-events.ics?scope=all')
    expect(
      buildDtsmFeedPath({
        venueIds: [1201, 1137, 1201],
        organizerIds: [700],
        categoryIds: [81]
      })
    ).toBe('/dtsm-events.ics?venues=1137%2C1201&organizers=700&categories=81')
    expect(
      buildDtsmFeedPath({
        venueIds: null,
        organizerIds: [700],
        categoryIds: null
      })
    ).toBe('/dtsm-events.ics?organizers=700')
    expect(
      buildDtsmFeedPath({
        venueIds: [],
        organizerIds: null,
        categoryIds: null
      })
    ).toBeNull()
    expect(
      buildDtsmFeedPath({
        venueIds: null,
        organizerIds: [],
        categoryIds: null
      })
    ).toBeNull()
    expect(
      buildDtsmFeedPath({
        venueIds: null,
        organizerIds: null,
        categoryIds: []
      })
    ).toBeNull()
  })

  it('builds Codex and absolute feed URLs', () => {
    expect(buildCodexFeedPath({ types: [...codexResetTypes] })).toBe(
      '/codex-resets.ics'
    )
    expect(buildCodexFeedPath({ types: ['forecast', 'regular'] })).toBe(
      '/codex-resets.ics?types=regular,forecast'
    )
    expect(buildCodexFeedPath({ types: [] })).toBeNull()
    const state = defaultExplorerState(false)
    expect(buildFeedUrl('https://cal.test', 'dtsm', state.filters)).toBe(
      'https://cal.test/dtsm-events.ics'
    )
    expect(buildFeedUrl('https://cal.test', 'codex', state.filters)).toBe(
      'https://cal.test/codex-resets.ics'
    )
  })

  it('toggles concrete and unrestricted ID selections', () => {
    expect(toggleId(null, 2, false, [1, 2, 3])).toEqual([1, 3])
    expect(toggleId(null, 2, true, [1, 2, 3])).toBeNull()
    expect(toggleId([1], 2, true, [1, 2, 3])).toEqual([1, 2])
    expect(toggleId([1, 2], 1, false, [1, 2, 3])).toEqual([2])
  })

  it('summarizes unrestricted, default, named, unknown, and multi selections', () => {
    expect(selectionSummary(null, options.venues, 'places')).toBe('All places')
    expect(selectionSummary([], options.venues, 'places')).toBe('No places')
    expect(
      selectionSummary(
        [...dtsmDefaultVenueIds],
        options.venues,
        'places',
        dtsmDefaultVenueIds
      )
    ).toBe('B Street + Central Park')
    expect(selectionSummary([9000], options.venues, 'places')).toBe('Other')
    expect(selectionSummary([9999], options.venues, 'places')).toBe(
      '1 selected'
    )
    expect(selectionSummary([9000, 9999], options.venues, 'places')).toBe(
      '2 selected'
    )
  })

  it('orders discovered options case-insensitively and breaks ties by ID', () => {
    expect(
      sortFilterOptions([
        { id: 4, name: 'zebra' },
        { id: 3, name: 'Alpha' },
        { id: 2, name: 'alpha' }
      ])
    ).toEqual([
      { id: 2, name: 'alpha' },
      { id: 3, name: 'Alpha' },
      { id: 4, name: 'zebra' }
    ])
  })
})
