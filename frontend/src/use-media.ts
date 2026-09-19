import { useEffect, useState } from 'react'

export function mediaMatches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => mediaMatches(query))
  useEffect(() => {
    /* istanbul ignore next -- Vite only mounts this browser application in a DOM. */
    if (typeof matchMedia !== 'function') return
    const media = matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}
