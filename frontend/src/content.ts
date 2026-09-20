import type { CodexResetType } from '@janejeon/calendars-shared'
import type { FeedId } from './calendar'

export const feeds = {
  dtsm: {
    name: 'Downtown San Mateo events',
    subtitle: 'What’s happening around B Street, Central Park, and downtown.',
    helper: 'Markets, festivals, and neighborhood events'
  },
  codex: {
    name: 'Codex reset watch',
    subtitle:
      'Reset history, scheduled windows, and forecasts in one calm view.',
    helper: 'Reset history and scheduled windows'
  }
} as const

export const feedOrder: FeedId[] = ['codex', 'dtsm']

export const resetLabels: Record<CodexResetType, string> = {
  regular: 'Regular resets',
  banked: 'Banked resets',
  scheduled: 'Scheduled windows',
  forecast: 'Forecasts'
}
