import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'
import fixture from '../../../fixtures/dtsm-events.json'
import {
  acquireLease,
  normalizeSnapshot,
  persistSnapshot,
  readEvents,
  readFilterOptions,
  readSyncState,
  recordFailure
} from '@/calendars/dtsm-events/repository.js'
import type { SourceEvent } from '@/calendars/dtsm-events/upstream.js'

const sourceEvents = fixture.events as unknown as SourceEvent[]
const db = env.CALENDAR_DB

async function resetDatabase(): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM dtsm_event_organizers'),
    db.prepare('DELETE FROM dtsm_event_categories'),
    db.prepare('DELETE FROM dtsm_events'),
    db.prepare('DELETE FROM dtsm_organizers'),
    db.prepare('DELETE FROM dtsm_categories'),
    db.prepare('DELETE FROM dtsm_venues'),
    db.prepare(
      `UPDATE dtsm_sync_state SET last_success_at = NULL,
       next_attempt_at = 0, lease_until = 0 WHERE calendar = 'dtsm-events'`
    )
  ])
}

beforeEach(resetDatabase)

describe('DTSM normalized repository', () => {
  it('maps each entity independently and discards noisy source images', () => {
    const snapshot = normalizeSnapshot(sourceEvents)
    expect(snapshot.events).toHaveLength(3)
    expect(snapshot.venues).toHaveLength(3)
    expect(snapshot.organizers).toHaveLength(2)
    expect(snapshot.categories).toHaveLength(2)
    expect(snapshot.eventOrganizers).toHaveLength(2)
    expect(snapshot.eventCategories).toHaveLength(2)
    expect(JSON.stringify(snapshot)).not.toContain('very-large-image')
    expect(snapshot.organizers.map(value => value.id)).toEqual([700, 701])

    const bare = normalizeSnapshot([
      {
        id: 1,
        title: 'Bare',
        description: '',
        start_date: '2026-01-01 00:00:00',
        end_date: '2026-01-01 01:00:00',
        all_day: false,
        status: 'publish'
      }
    ])
    expect(bare).toMatchObject({
      venues: [],
      organizers: [],
      categories: [],
      eventOrganizers: [],
      eventCategories: []
    })
    expect(bare.events[0]).toMatchObject({
      url: null,
      website: null,
      venue_id: null,
      created_utc: null,
      modified_utc: null
    })
  })

  it('persists all events but applies venue, organizer, and category filters on read', async () => {
    await persistSnapshot(
      db,
      sourceEvents,
      1_789_126_400,
      '2026-09-11 00:00:00'
    )

    expect(await readEvents(db)).toHaveLength(3)
    expect(await readEvents(db, { venueIds: [1201, 1137] })).toHaveLength(2)
    expect(await readEvents(db, { organizerIds: [701] })).toHaveLength(1)
    expect(await readEvents(db, { categoryIds: [81] })).toHaveLength(1)
    expect(await readEvents(db, { venueIds: [] })).toEqual([])
    expect(await readEvents(db, { organizerIds: [] })).toEqual([])
    expect(await readEvents(db, { categoryIds: [] })).toEqual([])
    expect(
      await readEvents(db, {
        venueIds: [1201, 1137],
        categoryIds: [81]
      })
    ).toHaveLength(1)
    expect(
      await readEvents(db, {
        venueIds: [1201],
        organizerIds: [701],
        categoryIds: [80]
      })
    ).toHaveLength(1)
    expect(
      await readEvents(db, {
        venueIds: [
          ...Array.from({ length: 200 }, (_, index) => index + 10_000),
          1201,
          1137,
          9999
        ]
      })
    ).toHaveLength(3)

    const [event] = await readEvents(db, { venueIds: [1201] })
    expect(event).toMatchObject({
      id: 6228,
      organizers: [
        'Downtown San Mateo Association',
        'Downtown San Mateo Association'
      ],
      categoryNames: ['Live Music']
    })
  })

  it('updates changed attributes and relationships without replacing identities', async () => {
    await persistSnapshot(db, sourceEvents, 100, '2026-09-11 00:00:00')
    const changed = structuredClone(sourceEvents)
    changed[0]!.title = 'Changed title'
    changed[0]!.organizer = [changed[0]!.organizer![1]!]
    await persistSnapshot(db, changed, 200, '2026-09-11 00:00:00')

    const [event] = await readEvents(db, { venueIds: [1201] })
    expect(event!.title).toBe('Changed title')
    expect(event!.organizers).toEqual(['Downtown San Mateo Association'])
    expect(event!.id).toBe(6228)
  })

  it('discovers only options referenced by non-withdrawn events in canonical order', async () => {
    await persistSnapshot(db, sourceEvents, 100, '2026-09-11 00:00:00')
    expect(await readFilterOptions(db)).toEqual({
      venues: [
        { id: 9999, name: 'Elsewhere' },
        { id: 1201, name: 'North B Street' },
        { id: 1137, name: 'San Mateo Central Park' }
      ],
      organizers: [
        { id: 700, name: 'Downtown San Mateo Association' },
        { id: 701, name: 'Downtown San Mateo Association' }
      ],
      categories: [
        { id: 81, name: 'Arts &#038; Culture' },
        { id: 80, name: 'Live Music' }
      ]
    })

    await persistSnapshot(db, [], 200, '2026-09-11 00:00:00')
    expect(await readFilterOptions(db)).toEqual({
      venues: [{ id: 1201, name: 'North B Street' }],
      organizers: [
        { id: 700, name: 'Downtown San Mateo Association' },
        { id: 701, name: 'Downtown San Mateo Association' }
      ],
      categories: [{ id: 80, name: 'Live Music' }]
    })
  })

  it('keeps ended history, withdraws missing future events, and restores reappearances', async () => {
    await persistSnapshot(db, sourceEvents, 100, '2026-09-11 00:00:00')
    await persistSnapshot(db, [], 200, '2026-09-11 00:00:00')

    const rows = await db
      .prepare('SELECT id, withdrawn_at FROM dtsm_events ORDER BY id')
      .all<{ id: number; withdrawn_at: number | null }>()
    expect(rows.results).toEqual([
      { id: 6228, withdrawn_at: null },
      { id: 6300, withdrawn_at: 200 },
      { id: 6400, withdrawn_at: 200 }
    ])
    expect(await readEvents(db)).toHaveLength(1)

    await persistSnapshot(db, [sourceEvents[1]!], 300, '2026-09-11 00:00:00')
    expect((await readEvents(db)).map(event => event.id)).toEqual([6228, 6300])
  })

  it('coordinates refresh leases and failure backoff in one state row', async () => {
    expect(await acquireLease(db, 1_000)).toBe(true)
    expect(await acquireLease(db, 1_001)).toBe(false)

    await recordFailure(db, 1_000, false)
    expect(await readSyncState(db)).toMatchObject({
      last_success_at: null,
      next_attempt_at: 4_600,
      lease_until: 0
    })
    await recordFailure(db, 1_000, true)
    expect((await readSyncState(db)).next_attempt_at).toBe(87_400)
  })

  it('returns no rows without issuing relationship queries for an empty result', async () => {
    expect(await readEvents(db)).toEqual([])
  })

  it('reads an event that has no venue', async () => {
    const bare = {
      ...sourceEvents[2]!,
      id: 6500,
      venue: undefined,
      url: '',
      website: ''
    }
    await persistSnapshot(db, [bare], 100, '2026-09-11 00:00:00')
    expect((await readEvents(db))[0]).toMatchObject({
      id: 6500,
      venue: null,
      url: null,
      website: null
    })
  })

  it('fails clearly if migration state is absent', async () => {
    await db
      .prepare("DELETE FROM dtsm_sync_state WHERE calendar = 'dtsm-events'")
      .run()
    await expect(readSyncState(db)).rejects.toThrow('sync state is missing')
    await db
      .prepare("INSERT INTO dtsm_sync_state (calendar) VALUES ('dtsm-events')")
      .run()
  })
})
