export function visualFilterPanel(name: string): boolean {
  /* istanbul ignore else -- Vite removes this visual-QA branch in production. */
  if (import.meta.env.DEV)
    return new URLSearchParams(window.location.search).get('__panel') === name
  /* istanbul ignore next -- unreachable in the development-mode test build. */
  return false
}

export function visualFilterSearch(name: string): string {
  /* istanbul ignore else -- Vite removes this visual-QA branch in production. */
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search)
    return params.get('__panel') === name ? (params.get('__search') ?? '') : ''
  }
  /* istanbul ignore next -- unreachable in the development-mode test build. */
  return ''
}

export function matchesFilter(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}
