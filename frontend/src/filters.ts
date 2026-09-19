import {
  calendarPaths,
  codexResetFilterParams,
  codexResetTypes,
  dtsmDefaultVenueIds,
  dtsmEventFilterParams,
  dtsmEventScopeValues,
  type CodexResetType,
  type DtsmFilterOption,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import { currentMonth, type FeedId, type ViewId } from './calendar'

export type IdSelection = number[] | null

export interface DtsmFilters {
  venueIds: IdSelection
  organizerIds: IdSelection
  categoryIds: IdSelection
}

export interface CodexFilters {
  types: CodexResetType[]
}

export interface ExplorerState {
  feed: FeedId
  view: ViewId
  month: string
  filters: {
    dtsm: DtsmFilters
    codex: CodexFilters
  }
}

export const STORAGE_KEY = 'calendar-explorer:v1'

export function sortFilterOptions(
  options: readonly DtsmFilterOption[]
): DtsmFilterOption[] {
  return [...options].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base'
    })
    return byName || left.id - right.id
  })
}

export function selectionSummary(
  selection: IdSelection,
  options: DtsmFilterOption[],
  noun: string,
  isDefaultPlaces = false
): string {
  if (selection === null) return `All ${noun}`
  if (selection.length === 0) return `No ${noun}`
  if (
    isDefaultPlaces &&
    selection.length === dtsmDefaultVenueIds.length &&
    dtsmDefaultVenueIds.every(id => selection.includes(id))
  )
    return 'B Street + Central Park'
  if (selection.length === 1)
    return (
      options.find(option => option.id === selection[0])?.name ?? '1 selected'
    )
  return `${selection.length} selected`
}

export function defaultExplorerState(
  isNarrow: boolean,
  now = new Date()
): ExplorerState {
  return {
    feed: 'dtsm',
    view: isNarrow ? 'list' : 'grid',
    month: currentMonth(now),
    filters: {
      dtsm: {
        venueIds: [...dtsmDefaultVenueIds],
        organizerIds: null,
        categoryIds: null
      },
      codex: { types: [...codexResetTypes] }
    }
  }
}

function numberSelection(value: unknown, fallback: IdSelection): IdSelection {
  if (value === null) return null
  if (!Array.isArray(value)) return fallback
  if (
    value.some(
      item =>
        typeof item !== 'number' || !Number.isSafeInteger(item) || item <= 0
    )
  )
    return fallback
  return [...new Set(value)].sort((left, right) => left - right)
}

function resetTypes(value: unknown): CodexResetType[] {
  if (!Array.isArray(value)) return [...codexResetTypes]
  if (value.some(item => !codexResetTypes.includes(item as CodexResetType)))
    return [...codexResetTypes]
  return codexResetTypes.filter(type => value.includes(type))
}

function validMonth(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false
  const month = Number(value.slice(5))
  return month >= 1 && month <= 12
}

export function readExplorerState(
  storage: Pick<Storage, 'getItem'>,
  isNarrow: boolean,
  now = new Date()
): ExplorerState {
  const fallback = defaultExplorerState(isNarrow, now)
  let parsed: unknown
  try {
    const value = storage.getItem(STORAGE_KEY)
    if (!value) return fallback
    parsed = JSON.parse(value)
  } catch {
    return fallback
  }
  if (!parsed || typeof parsed !== 'object') return fallback
  const value = parsed as Record<string, unknown>
  const filters =
    value.filters && typeof value.filters === 'object'
      ? (value.filters as Record<string, unknown>)
      : {}
  const dtsm =
    filters.dtsm && typeof filters.dtsm === 'object'
      ? (filters.dtsm as Record<string, unknown>)
      : {}
  const codex =
    filters.codex && typeof filters.codex === 'object'
      ? (filters.codex as Record<string, unknown>)
      : {}
  return {
    feed:
      value.feed === 'codex' || value.feed === 'dtsm'
        ? value.feed
        : fallback.feed,
    view:
      value.view === 'grid' || value.view === 'list'
        ? value.view
        : fallback.view,
    month: validMonth(value.month) ? value.month : fallback.month,
    filters: {
      dtsm: {
        venueIds: numberSelection(
          dtsm.venueIds,
          fallback.filters.dtsm.venueIds
        ),
        organizerIds: numberSelection(dtsm.organizerIds, null),
        categoryIds: numberSelection(dtsm.categoryIds, null)
      },
      codex: { types: resetTypes(codex.types) }
    }
  }
}

export function writeExplorerState(
  storage: Pick<Storage, 'setItem'>,
  state: ExplorerState
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function reconcileSelection(
  selection: IdSelection,
  validIds: number[],
  fallback: IdSelection
): IdSelection {
  if (selection === null || selection.length === 0) return selection
  const valid = new Set(validIds)
  const result = selection.filter(id => valid.has(id))
  return result.length > 0 ? result : fallback
}

export function reconcileDtsmFilters(
  filters: DtsmFilters,
  options: DtsmFilterOptionsResponse
): DtsmFilters {
  const defaultSelection =
    filters.venueIds !== null &&
    sameIds(filters.venueIds, options.defaultVenueIds)
      ? [...options.defaultVenueIds]
      : reconcileSelection(
          filters.venueIds,
          options.venues.map(option => option.id),
          [...options.defaultVenueIds]
        )
  return {
    venueIds: defaultSelection,
    organizerIds: reconcileSelection(
      filters.organizerIds,
      options.organizers.map(option => option.id),
      null
    ),
    categoryIds: reconcileSelection(
      filters.categoryIds,
      options.categories.map(option => option.id),
      null
    )
  }
}

function canonicalIds(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function sameIds(left: number[], right: readonly number[]): boolean {
  const canonicalLeft = canonicalIds(left)
  const canonicalRight = canonicalIds([...right])
  return (
    canonicalLeft.length === canonicalRight.length &&
    canonicalLeft.every((value, index) => value === canonicalRight[index])
  )
}

function appendIds(
  params: URLSearchParams,
  name: string,
  values: IdSelection
): void {
  if (values !== null) params.set(name, canonicalIds(values).join(','))
}

export function buildDtsmFeedPath(filters: DtsmFilters): string | null {
  if (
    filters.venueIds?.length === 0 ||
    filters.organizerIds?.length === 0 ||
    filters.categoryIds?.length === 0
  )
    return null
  if (
    filters.venueIds !== null &&
    sameIds(filters.venueIds, dtsmDefaultVenueIds) &&
    filters.organizerIds === null &&
    filters.categoryIds === null
  )
    return calendarPaths.dtsmEvents

  const params = new URLSearchParams()
  if (
    filters.venueIds === null &&
    filters.organizerIds === null &&
    filters.categoryIds === null
  ) {
    params.set(dtsmEventFilterParams.scope, dtsmEventScopeValues.all)
  } else {
    appendIds(params, dtsmEventFilterParams.venues, filters.venueIds)
    appendIds(params, dtsmEventFilterParams.organizers, filters.organizerIds)
    appendIds(params, dtsmEventFilterParams.categories, filters.categoryIds)
  }
  return `${calendarPaths.dtsmEvents}?${params}`
}

export function buildCodexFeedPath(filters: CodexFilters): string | null {
  const selected = codexResetTypes.filter(type => filters.types.includes(type))
  if (selected.length === 0) return null
  return selected.length === codexResetTypes.length
    ? calendarPaths.codexResets
    : `${calendarPaths.codexResets}?${codexResetFilterParams.types}=${selected.join(',')}`
}

export function buildFeedUrl(
  origin: string,
  feed: FeedId,
  filters: ExplorerState['filters']
): string | null {
  const path =
    feed === 'dtsm'
      ? buildDtsmFeedPath(filters.dtsm)
      : buildCodexFeedPath(filters.codex)
  return path ? new URL(path, origin).toString() : null
}

export function toggleId(
  selection: IdSelection,
  id: number,
  checked: boolean,
  allIds: number[]
): IdSelection {
  if (selection === null)
    return checked ? null : canonicalIds(allIds.filter(value => value !== id))
  const next = new Set(selection)
  if (checked) next.add(id)
  else next.delete(id)
  return canonicalIds([...next])
}
