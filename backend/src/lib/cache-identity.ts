export const CUSTOM_RESPONSE_CACHE_RETENTION_SECONDS = 30 * 24 * 60 * 60

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashedResponseCacheKey(
  baseKey: string,
  canonicalQuery: string
): Promise<string> {
  if (!canonicalQuery) return baseKey

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalQuery)
  )
  return `${baseKey}:${hex(digest)}`
}

export function customResponseCacheExpirationTtl(
  canonicalQuery: string
): number | undefined {
  return canonicalQuery ? CUSTOM_RESPONSE_CACHE_RETENTION_SECONDS : undefined
}
