import { describe, expect, it } from 'vitest'
import {
  calendarApiPaths,
  calendarPaths,
  calendarServiceName,
  codexResetFilterParams,
  codexResetTypes,
  dtsmDefaultVenueIds,
  dtsmEventFilterParams,
  dtsmEventScopeValues,
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
})
