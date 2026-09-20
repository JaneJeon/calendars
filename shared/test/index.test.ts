import { describe, expect, it } from 'vitest'
import {
  calendarApiPaths,
  calendarPaths,
  calendarServiceName,
  codexResetFilterParams,
  codexResetTypes,
  buildDtsmFilterModel,
  canonicalDtsmCategoryName,
  dtsmBStreetVenues,
  dtsmCentralParkVenue,
  dtsmDefaultVenueIds,
  dtsmEventFilterParams,
  dtsmEventScopeValues,
  isDtsmSeriesCategory,
  normalizeDtsmCategoryNames,
  normalizeDtsmOrganizerNames,
  type CodexResetType,
  type DtsmFilterOptionsResponse,
  type DtsmEventFilterParam,
  type CalendarPath
} from '@janejeon/calendars-shared'

describe('calendar contract', () => {
  it('exports the feed paths and their string-literal type', () => {
    const path: CalendarPath = calendarPaths.codexResets

    expect(path).toBe('/codex-resets.ics')
    expect(calendarPaths.dtsmEvents).toBe('/dtsm-events.ics')
  })

  it('exports the service name used by both applications', () => {
    expect(calendarServiceName).toBe('Calendars')
  })

  it('exports the DTSM query-parameter contract', () => {
    const parameter: DtsmEventFilterParam = dtsmEventFilterParams.venues

    expect(parameter).toBe('venues')
    expect(dtsmEventFilterParams).toEqual({
      scope: 'scope',
      venues: 'venues',
      organizers: 'organizers',
      categories: 'categories'
    })
    expect(dtsmEventScopeValues.all).toBe('all')
    expect(dtsmDefaultVenueIds).toEqual([1201, 1249, 1260, 1328, 3999, 1137])
  })

  it('exports browser API and Codex filter contracts', () => {
    const type: CodexResetType = codexResetTypes[0]
    const response: DtsmFilterOptionsResponse = {
      defaultVenueIds: [1201],
      venues: [{ id: 1201, name: 'North B Street' }],
      organizers: [],
      categories: []
    }

    expect(calendarApiPaths.dtsmOptions).toBe('/dtsm-events/options.json')
    expect(codexResetFilterParams.types).toBe('types')
    expect(codexResetTypes).toEqual([
      'regular',
      'banked',
      'scheduled',
      'forecast'
    ])
    expect(type).toBe('regular')
    expect(response.venues[0]?.name).toBe('North B Street')
  })

  it('builds the semantic DTSM filter model from raw source entities', () => {
    const model = buildDtsmFilterModel({
      venues: [
        { id: 1249, name: 'South B Street' },
        { id: 9000, name: 'zebra hall' },
        { id: 1137, name: 'Central Park from source' },
        { id: 8000, name: 'Alpha Hall' },
        { id: 7000, name: 'Alpha Hall' }
      ],
      organizers: [
        { id: 701, name: '  Downtown   San Mateo Association ' },
        { id: 700, name: 'downtown san mateo association' },
        { id: 702, name: 'Another Organizer' },
        { id: 703, name: 'resume' },
        { id: 704, name: 'résumé' }
      ],
      categories: [
        { id: 15, name: 'Events' },
        { id: 25, name: 'Event' },
        { id: 14, name: 'Promotions' },
        { id: 26, name: 'Promotion' },
        { id: 24, name: 'Head West 2026' },
        { id: 30, name: 'Workshops' }
      ]
    })

    expect(model).toEqual({
      version: 1,
      placeGroups: [
        {
          key: 'place-group:b-street',
          name: 'B Street',
          ids: [1201, 1249, 1260, 1328, 3999],
          children: dtsmBStreetVenues
        }
      ],
      places: [
        dtsmCentralParkVenue,
        { id: 7000, name: 'Alpha Hall' },
        { id: 8000, name: 'Alpha Hall' },
        { id: 9000, name: 'zebra hall' }
      ],
      eventTypes: [
        { key: 'event-type:events', name: 'Events', ids: [15, 25] },
        {
          key: 'event-type:promotions',
          name: 'Promotions',
          ids: [14, 26]
        },
        { key: 'event-type:workshops', name: 'Workshops', ids: [30] }
      ],
      organizers: [
        {
          key: 'organizer:another organizer',
          name: 'Another Organizer',
          ids: [702]
        },
        {
          key: 'organizer:downtown san mateo association',
          name: 'Downtown San Mateo Association',
          ids: [700, 701]
        },
        {
          key: 'organizer:resume',
          name: 'resume',
          ids: [703]
        },
        {
          key: 'organizer:résumé',
          name: 'résumé',
          ids: [704]
        }
      ]
    })
  })

  it('normalizes display metadata without discarding future categories', () => {
    expect(canonicalDtsmCategoryName(' event ')).toBe('Events')
    expect(canonicalDtsmCategoryName('PROMOTION')).toBe('Promotions')
    expect(canonicalDtsmCategoryName(' Workshops  &  Classes ')).toBe(
      'Workshops & Classes'
    )
    expect(isDtsmSeriesCategory('Head West 2027')).toBe(true)
    expect(isDtsmSeriesCategory('Head West Marketplace')).toBe(false)
    expect(
      normalizeDtsmCategoryNames([
        'Event',
        'events',
        'Head West 2026',
        'Workshops',
        ' workshops '
      ])
    ).toEqual(['Events', 'Head West 2026', 'Workshops'])
    expect(
      normalizeDtsmOrganizerNames([
        'Downtown San Mateo Association',
        ' downtown san mateo association ',
        '',
        'City of San Mateo'
      ])
    ).toEqual(['Downtown San Mateo Association', 'City of San Mateo'])
  })
})
