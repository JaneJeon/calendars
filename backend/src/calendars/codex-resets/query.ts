import {
  codexResetFilterParams,
  codexResetTypes,
  type CodexResetType
} from '@janejeon/calendars-shared'
import { InvalidRequestError } from '@/errors.js'
import type { CalendarEvent } from '@/lib/ics.js'
import {
  CUSTOM_RESPONSE_CACHE_RETENTION_SECONDS,
  customResponseCacheExpirationTtl,
  hashedResponseCacheKey
} from '@/lib/cache-identity.js'

export const CUSTOM_CODEX_CACHE_RETENTION_SECONDS =
  CUSTOM_RESPONSE_CACHE_RETENTION_SECONDS

export interface ParsedCodexResetFilter {
  types: CodexResetType[]
  canonicalQuery: string
}

function invalid(message: string): never {
  throw new InvalidRequestError(`Invalid Codex reset filters: ${message}`)
}

export function parseCodexResetFilter(
  searchParams: URLSearchParams
): ParsedCodexResetFilter {
  for (const name of searchParams.keys())
    if (name !== codexResetFilterParams.types)
      invalid(`unknown parameter ${name}`)

  const values = searchParams.getAll(codexResetFilterParams.types)
  if (values.length === 0)
    return { types: [...codexResetTypes], canonicalQuery: '' }
  if (values.length > 1) invalid('types may appear only once')

  const tokens = values[0]!.split(',').map(value => value.trim())
  const allowed = new Set<string>(codexResetTypes)
  if (tokens.some(value => !allowed.has(value)))
    invalid(`types must use ${codexResetTypes.join(', ')}`)

  const selected = codexResetTypes.filter(type => tokens.includes(type))
  return {
    types: selected,
    canonicalQuery:
      selected.length === codexResetTypes.length
        ? ''
        : `${codexResetFilterParams.types}=${selected.join(',')}`
  }
}

export function filterCodexResetEvents(
  events: CalendarEvent[],
  types: CodexResetType[]
): CalendarEvent[] {
  const selected = new Set<string>(types)
  const known = new Set<unknown>(codexResetTypes)
  return events.filter(event => {
    const recognized = (event.categories ?? []).filter(category =>
      known.has(category)
    )
    if (recognized.length === 0) return types.length === codexResetTypes.length
    return recognized.some(category => selected.has(category))
  })
}

export async function codexResponseCacheKey(request: Request): Promise<string> {
  const { canonicalQuery } = parseCodexResetFilter(
    new URL(request.url).searchParams
  )
  return hashedResponseCacheKey('codex-resets.ics', canonicalQuery)
}

export function codexResponseCacheExpirationTtl(
  request: Request
): number | undefined {
  const { canonicalQuery } = parseCodexResetFilter(
    new URL(request.url).searchParams
  )
  return customResponseCacheExpirationTtl(canonicalQuery)
}

export function codexResponseFallbackEligible(
  body: string,
  request: Request
): boolean {
  const { canonicalQuery } = parseCodexResetFilter(
    new URL(request.url).searchParams
  )
  return !canonicalQuery || body.includes('\r\nBEGIN:VEVENT\r\n')
}
