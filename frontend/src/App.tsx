import { useEffect, useMemo, useState } from 'react'
import { Box, Container } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import {
  codexResetTypes,
  dtsmDefaultVenueIds,
  type CodexResetType
} from '@janejeon/calendars-shared'
import {
  CALENDAR_API_ORIGIN,
  feedStaleTime,
  fetchCalendar,
  fetchDtsmOptions
} from './api'
import {
  monthLabel,
  projectionsForMonth,
  type FeedId,
  type ViewId
} from './calendar'
import { CalendarPanel } from './components/CalendarPanel'
import {
  ExplorerFilters,
  type DtsmFilterKey
} from './components/ExplorerFilters'
import { ExplorerHeader } from './components/ExplorerHeader'
import {
  buildFeedUrl,
  defaultExplorerState,
  readExplorerState,
  reconcileExplorerState,
  writeExplorerState,
  type ExplorerState,
  type IdSelection
} from './filters'
import { mediaMatches, useMedia } from './use-media'

export default function App() {
  const isNarrow = useMedia('(max-width: 700px)')
  const compactGrid = useMedia('(max-width: 1150px)')
  const [state, setState] = useState<ExplorerState>(() => {
    /* istanbul ignore if -- localStorage is present in every supported browser. */
    if (typeof localStorage === 'undefined') return defaultExplorerState(false)
    return readExplorerState(localStorage, mediaMatches('(max-width: 700px)'))
  })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [focusDay, setFocusDay] = useState<string | null>(null)

  useEffect(() => {
    if (!status) return
    const timeout = window.setTimeout(() => setStatus(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [status])

  const optionsQuery = useQuery({
    queryKey: ['dtsm-options', CALENDAR_API_ORIGIN],
    queryFn: ({ signal }) => fetchDtsmOptions(signal),
    staleTime: 60 * 60 * 1000,
    retry: 1
  })
  const explorer = useMemo(
    () => reconcileExplorerState(state, optionsQuery.data),
    [optionsQuery.data, state]
  )
  useEffect(() => {
    /* istanbul ignore else -- localStorage is present in every supported browser. */
    if (typeof localStorage !== 'undefined')
      writeExplorerState(localStorage, explorer)
  }, [explorer])

  const feedUrl = useMemo(
    () => buildFeedUrl(CALENDAR_API_ORIGIN, explorer.feed, explorer.filters),
    [explorer.feed, explorer.filters]
  )
  const feedQuery = useQuery({
    queryKey: ['calendar-feed', explorer.feed, feedUrl],
    queryFn: ({ signal }) => fetchCalendar(feedUrl!, explorer.feed, signal),
    enabled: feedUrl !== null,
    staleTime: feedStaleTime(explorer.feed),
    retry: 1
  })
  const projections = useMemo(
    () => projectionsForMonth(feedQuery.data ?? [], explorer.month),
    [explorer.month, feedQuery.data]
  )

  const change = (fn: (current: ExplorerState) => ExplorerState) => {
    setSelectedKey(null)
    setState(current => fn(reconcileExplorerState(current, optionsQuery.data)))
  }
  const setFeed = (feed: FeedId) => change(current => ({ ...current, feed }))
  const setMonth = (month: string) => change(current => ({ ...current, month }))
  const setView = (view: ViewId) => change(current => ({ ...current, view }))
  const setDtsmFilter = (key: DtsmFilterKey, value: IdSelection) =>
    change(current => ({
      ...current,
      filters: {
        ...current.filters,
        dtsm: { ...current.filters.dtsm, [key]: value }
      }
    }))
  const toggleReset = (type: CodexResetType, checked: boolean) =>
    change(current => {
      const next = new Set(current.filters.codex.types)
      if (checked) next.add(type)
      else next.delete(type)
      return {
        ...current,
        filters: {
          ...current.filters,
          codex: { types: codexResetTypes.filter(value => next.has(value)) }
        }
      }
    })

  useEffect(() => {
    if (!focusDay || explorer.view !== 'list') return
    requestAnimationFrame(() => {
      document
        .getElementById(`calendar-list-day-${focusDay}`)
        ?.querySelector<HTMLElement>('button')
        ?.focus()
      setFocusDay(null)
    })
  }, [explorer.view, focusDay, projections])

  const venueIsDefault =
    explorer.filters.dtsm.venueIds !== null &&
    explorer.filters.dtsm.venueIds.length === dtsmDefaultVenueIds.length &&
    dtsmDefaultVenueIds.every(id =>
      explorer.filters.dtsm.venueIds?.includes(id)
    )
  const activeFilters =
    explorer.feed === 'dtsm'
      ? Number(!venueIsDefault) +
        Number(explorer.filters.dtsm.organizerIds !== null) +
        Number(explorer.filters.dtsm.categoryIds !== null)
      : Number(explorer.filters.codex.types.length !== codexResetTypes.length)
  const emptyMessage =
    feedUrl === null
      ? 'No events match an empty filter selection. Choose at least one option to subscribe.'
      : feedQuery.isSuccess && projections.length === 0
        ? `No events in ${monthLabel(explorer.month)} for these filters.`
        : undefined
  const subscriptionDisabled = feedUrl === null || !feedQuery.isSuccess
  const subscriptionMessage =
    feedUrl === null
      ? 'Choose at least one filter option before subscribing.'
      : feedQuery.isPending
        ? 'Loading this exact subscription before it can be added.'
        : feedQuery.isError
          ? 'Retry this calendar before subscribing.'
          : 'Subscription matches these filters and includes every date.'

  return (
    <Box
      id="calendar-explorer"
      minH="100vh"
      w="100%"
      pb="52px"
      bg="calendar.canvas"
      color="calendar.text"
      fontFamily="body"
      lineHeight="1.45"
    >
      <ExplorerHeader
        feed={explorer.feed}
        feedUrl={feedUrl}
        subscriptionDisabled={subscriptionDisabled}
        subscriptionMessage={subscriptionMessage}
        status={status}
        onFeedChange={setFeed}
        onStatus={setStatus}
      />
      <Container
        as="main"
        maxW="1440px"
        px={{ base: '14px', md: '24px' }}
        pt={{ base: '14px', md: '20px' }}
      >
        <ExplorerFilters
          feed={explorer.feed}
          filters={explorer.filters}
          isNarrow={isNarrow}
          open={filtersOpen}
          activeFilters={activeFilters}
          options={optionsQuery.data}
          optionsPending={optionsQuery.isPending}
          onOpenChange={setFiltersOpen}
          onOptionsRetry={() => void optionsQuery.refetch()}
          onDtsmChange={setDtsmFilter}
          onResetChange={toggleReset}
        />
        <CalendarPanel
          month={explorer.month}
          view={explorer.view}
          projections={projections}
          isNarrow={isNarrow}
          compactGrid={compactGrid}
          selectedKey={selectedKey}
          pending={feedQuery.isPending && feedUrl !== null}
          error={feedQuery.error}
          emptyMessage={emptyMessage}
          onMonthChange={setMonth}
          onViewChange={setView}
          onSelectedKeyChange={setSelectedKey}
          onShowDayInList={day => {
            setFocusDay(day)
            setView('list')
          }}
          onRetry={() => void feedQuery.refetch()}
        />
      </Container>
    </Box>
  )
}
