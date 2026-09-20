import { UpstreamError } from '@/errors.js'

export interface ResponseCacheStore {
  getWithMetadata<Metadata = unknown>(
    key: string
  ): Promise<{ value: string | null; metadata: Metadata | null }>
  put(
    key: string,
    value: string,
    options?: { metadata?: unknown; expirationTtl?: number }
  ): Promise<void>
}

export interface ResponseCacheOptions {
  store: ResponseCacheStore
  key: string
  freshnessSeconds: number
  expirationTtlSeconds?: number
  label: string
  build: () => Promise<string>
  fallbackEligible?: (body: string) => boolean
}

interface ResponseCacheMetadata {
  cachedAt?: number
  fallbackEligible?: boolean
}

export async function withResponseCache({
  store,
  key,
  freshnessSeconds,
  expirationTtlSeconds,
  label,
  build,
  fallbackEligible = () => true
}: ResponseCacheOptions): Promise<string> {
  let cachedBody: string | undefined

  try {
    const cached = await store.getWithMetadata<ResponseCacheMetadata>(key)
    if (cached.value) {
      const cachedAt = cached.metadata?.cachedAt
      const ageSeconds =
        typeof cachedAt === 'number' ? (Date.now() - cachedAt) / 1000 : Infinity

      if (ageSeconds >= 0 && ageSeconds < freshnessSeconds) {
        return cached.value
      }
      if (cached.metadata?.fallbackEligible !== false) cachedBody = cached.value
    }
  } catch (error: unknown) {
    console.warn(`${label} response cache read failed`, error)
  }

  try {
    const body = await build()

    try {
      const options: {
        metadata: { cachedAt: number; fallbackEligible?: false }
        expirationTtl?: number
      } = { metadata: { cachedAt: Date.now() } }
      if (!fallbackEligible(body)) options.metadata.fallbackEligible = false
      if (expirationTtlSeconds !== undefined)
        options.expirationTtl = expirationTtlSeconds
      await store.put(key, body, options)
    } catch (error: unknown) {
      console.warn(`${label} response cache write failed`, error)
    }

    return body
  } catch (error: unknown) {
    if (error instanceof UpstreamError && cachedBody) {
      console.warn(`${label} refresh failed, serving cached response`, error)
      return cachedBody
    }
    throw error
  }
}
