import { env, exports } from 'cloudflare:workers'
import ICAL from 'ical.js'
import { describe, expect, it } from 'vitest'

const testEnv = env as typeof env & {
  RUN_E2E?: string
  DEPLOYED_URL?: string
}
const runE2E = testEnv.RUN_E2E === '1'
const deployedUrl = testEnv.DEPLOYED_URL

describe.skipIf(!runE2E)('live upstream', () => {
  it('builds a valid feed from the real API with at least 52 events', async () => {
    const response = await exports.default.fetch(
      'http://example.com/codex-resets.ics'
    )
    expect(response.status).toBe(200)

    const body = await response.text()
    const jcal = ICAL.parse(body)
    const component = new ICAL.Component(jcal)
    const events = component.getAllSubcomponents('vevent')

    expect(events.length).toBeGreaterThanOrEqual(52)

    const categories = new Set(
      events.flatMap(event => event.getFirstPropertyValue('categories') ?? [])
    )
    expect(categories.has('regular')).toBe(true)
    expect(categories.has('banked')).toBe(true)

    for (const event of events) {
      const dtstart = event.getFirstProperty('dtstart')
      if (dtstart?.getParameter('value') !== 'DATE') continue
      const start = event.getFirstPropertyValue('dtstart') as {
        toJSDate(): Date
      } | null
      const end = event.getFirstPropertyValue('dtend') as {
        toJSDate(): Date
      } | null
      if (!start || !end) continue
      const diffDays =
        (end.toJSDate().getTime() - start.toJSDate().getTime()) /
        (24 * 60 * 60 * 1000)
      expect(diffDays).toBeGreaterThanOrEqual(1)
    }
  })

  it('stores the live DTSM catalog and builds a valid filtered feed', async () => {
    const response = await exports.default.fetch(
      'http://example.com/dtsm-events.ics'
    )
    expect(response.status).toBe(200)
    const component = new ICAL.Component(ICAL.parse(await response.text()))
    expect(component.getAllSubcomponents('vevent').length).toBeGreaterThan(0)
  }, 60_000)
})

describe.skipIf(!runE2E || !deployedUrl)('deployed feed', () => {
  it('serves a valid feed from the deployed URL', async () => {
    // The zone blocks requests without a User-Agent (AGENTS.md, Domain).
    const response = await fetch(deployedUrl!, {
      headers: { 'User-Agent': 'calendars-smoke-test' }
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/calendar; charset=utf-8'
    )

    const body = await response.text()
    const jcal = ICAL.parse(body)
    const component = new ICAL.Component(jcal)
    expect(
      component.getAllSubcomponents('vevent').length
    ).toBeGreaterThanOrEqual(52)
  })

  it('serves only regular events for the deployed regular-only URL', async () => {
    const response = await fetch(
      new URL('/codex-resets.ics?types=regular', deployedUrl!),
      { headers: { 'User-Agent': 'calendars-smoke-test' } }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=900')
    const component = new ICAL.Component(ICAL.parse(await response.text()))
    const events = component.getAllSubcomponents('vevent')
    expect(events.length).toBeGreaterThan(0)
    for (const event of events)
      expect(event.getFirstProperty('categories')?.getValues()).toEqual([
        'regular'
      ])
  })

  it('serves the deployed DTSM feed', async () => {
    const response = await fetch(new URL('/dtsm-events.ics', deployedUrl!), {
      headers: { 'User-Agent': 'calendars-smoke-test' }
    })
    expect(response.status).toBe(200)
    const component = new ICAL.Component(ICAL.parse(await response.text()))
    expect(component.getAllSubcomponents('vevent').length).toBeGreaterThan(0)
  })

  it('serves a deployed filtered DTSM view', async () => {
    const response = await fetch(
      new URL('/dtsm-events.ics?venues=999999999', deployedUrl!),
      { headers: { 'User-Agent': 'calendars-smoke-test' } }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
    const component = new ICAL.Component(ICAL.parse(await response.text()))
    expect(component.getAllSubcomponents('vevent')).toHaveLength(0)
  })

  it('serves DTSM filter discovery from the deployed URL', async () => {
    const response = await fetch(
      new URL('/dtsm-events/options.json', deployedUrl!),
      { headers: { 'User-Agent': 'calendars-smoke-test' } }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/json; charset=utf-8'
    )
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
    const options = await response.json<{
      defaultVenueIds: number[]
      venues: unknown[]
      organizers: unknown[]
      categories: unknown[]
      filterModel: {
        version: number
        placeGroups: Array<{ name: string; ids: number[] }>
        eventTypes: Array<{ name: string; ids: number[] }>
      }
    }>()
    expect(options).toMatchObject({
      defaultVenueIds: expect.any(Array),
      venues: expect.any(Array),
      organizers: expect.any(Array),
      categories: expect.any(Array),
      filterModel: {
        version: 1,
        placeGroups: [
          expect.objectContaining({
            name: 'B Street',
            ids: [1201, 1249, 1260, 1328, 3999]
          })
        ],
        eventTypes: expect.any(Array)
      }
    })
    expect(options.venues.length).toBeGreaterThan(0)
    expect(options.filterModel.eventTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Events', ids: [15, 25] }),
        expect.objectContaining({ name: 'Promotions', ids: [14, 26] })
      ])
    )
  })
})
