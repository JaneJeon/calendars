export function visualFilterPanel(name: string): boolean {
  /* istanbul ignore next -- Vite removes this visual-QA branch in production. */
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('__panel') === name
  )
}

export function matchesFilter(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}
