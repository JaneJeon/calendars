import { describe, expect, it, vi } from 'vitest'
import {
  CALENDAR_API_ORIGIN,
  CalendarRequestError,
  calendarApiOrigin,
  feedStaleTime,
  fetchCalendar,
  fetchDtsmOptions
} from './api'

const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:test\r
SUMMARY:Test event\r
DTSTART;VALUE=DATE:20260912\r
DTEND;VALUE=DATE:20260913\r
END:VEVENT\r
END:VCALENDAR\r
`

describe('calendar API client', () => {
  it('uses the local Wrangler origin in development', () => {
    expect(CALENDAR_API_ORIGIN).toBe('http://localhost:8787')
    expect(calendarApiOrigin(false)).toBe('https://cal.janejeon.dev')
    expect(calendarApiOrigin(true)).toBe('http://localhost:8787')
    expect(feedStaleTime('dtsm')).toBe(3_600_000)
    expect(feedStaleTime('codex')).toBe(900_000)
  })

  it('fetches DTSM options and parses feed text', async () => {
    const options = {
      defaultVenueIds: [1201],
      venues: [{ id: 1201, name: 'North B Street' }],
      organizers: [],
      categories: []
    }
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(options), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(calendar))
    expect(await fetchDtsmOptions(undefined, request)).toMatchObject({
      ...options,
      filterModel: {
        version: 1,
        placeGroups: [
          expect.objectContaining({
            name: 'B Street',
            ids: [1201, 1249, 1260, 1328, 3999]
          })
        ],
        places: [{ id: 1137, name: 'San Mateo Central Park' }]
      }
    })
    expect(
      (
        await fetchCalendar(
          'https://cal.test/feed.ics',
          'dtsm',
          undefined,
          request
        )
      )[0]
    ).toMatchObject({ uid: 'test', title: 'Test event' })
  })

  it('surfaces response status and server detail', async () => {
    const detail = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Specific failure', { status: 502 }))
    await expect(fetchDtsmOptions(undefined, detail)).rejects.toMatchObject({
      message: 'Specific failure',
      status: 502
    })
    const generic = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 500 }))
    await expect(
      fetchCalendar('https://cal.test/feed.ics', 'codex', undefined, generic)
    ).rejects.toEqual(
      new CalendarRequestError('Calendar service returned 500', 500)
    )
    const challenge = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<html>Cloudflare challenge</html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      })
    )
    await expect(fetchDtsmOptions(undefined, challenge)).rejects.toEqual(
      new CalendarRequestError('Calendar service returned 503', 503)
    )
  })

  it('rejects structurally invalid discovery and non-calendar success bodies', async () => {
    const invalidOptions = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ defaultVenueIds: ['bad'] }))
      )
    await expect(fetchDtsmOptions(undefined, invalidOptions)).rejects.toThrow(
      'invalid filter options'
    )
    const invalidModel = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          defaultVenueIds: [1201],
          venues: [],
          organizers: [],
          categories: [],
          filterModel: { version: 2 }
        })
      )
    )
    await expect(fetchDtsmOptions(undefined, invalidModel)).rejects.toThrow(
      'invalid filter options'
    )

    const html = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>not a calendar</html>'))
    await expect(
      fetchCalendar('https://cal.test/feed.ics', 'dtsm', undefined, html)
    ).rejects.toBeInstanceOf(Error)
  })

  it('uses development fixtures for busy, empty, and failure states', async () => {
    window.history.replaceState({}, '', '/?__scenario=busy')
    const request = vi.fn<typeof fetch>()
    expect(
      (await fetchDtsmOptions(undefined, request)).venues.length
    ).toBeGreaterThan(1)
    expect(
      (await fetchCalendar('https://unused.test', 'dtsm', undefined, request))
        .length
    ).toBeGreaterThan(3)
    expect(
      await fetchCalendar(
        'http://localhost:8787/dtsm-events.ics?venues=6441',
        'dtsm',
        undefined,
        request
      )
    ).toHaveLength(1)
    window.history.replaceState({}, '', '/?__scenario=long')
    expect(
      await fetchCalendar(
        'http://localhost:8787/dtsm-events.ics?scope=all',
        'dtsm',
        undefined,
        request
      )
    ).toHaveLength(1)
    window.history.replaceState({}, '', '/?__scenario=busy')
    expect(
      await fetchCalendar(
        'http://localhost:8787/dtsm-events.ics?organizers=3229&categories=24',
        'dtsm',
        undefined,
        request
      )
    ).toHaveLength(1)
    expect(
      await fetchCalendar(
        'http://localhost:8787/dtsm-events.ics?scope=all',
        'dtsm',
        undefined,
        request
      )
    ).toHaveLength(9)
    expect(
      await fetchCalendar(
        'http://localhost:8787/codex-resets.ics?types=regular',
        'codex',
        undefined,
        request
      )
    ).toHaveLength(1)
    expect(request).not.toHaveBeenCalled()

    window.history.replaceState({}, '', '/?__scenario=empty')
    expect(
      await fetchCalendar('https://unused.test', 'codex', undefined, request)
    ).toEqual([])

    window.history.replaceState({}, '', '/?__scenario=options-error')
    await expect(fetchDtsmOptions(undefined, request)).rejects.toMatchObject({
      status: 503
    })
    window.history.replaceState({}, '', '/?__scenario=feed-error')
    await expect(
      fetchCalendar('https://unused.test', 'dtsm', undefined, request)
    ).rejects.toMatchObject({ status: 503 })
  })
})
