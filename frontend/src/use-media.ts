import { useEffect, useState } from 'react'

export function mediaMatches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => mediaMatches(query))
  useEffect(() => {
    /* istanbul ignore next -- the test environment always defines matchMedia. */
    if (typeof matchMedia !== 'function') return
    const media = matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}
