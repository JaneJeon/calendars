import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { setMedia } from './test-setup'
import { system } from './theme'
import { visualCalendar, visualOptions } from './visual-fixtures'

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </ChakraProvider>
  )
}

async function renderScenario(scenario = 'busy') {
  window.history.replaceState({}, '', `/?__scenario=${scenario}`)
  const result = renderApp()
  if (scenario !== 'feed-error')
    await screen.findByRole('button', { name: /Yoga in the Park/ })
  return result
}

describe('Calendar explorer', () => {
  it('renders the settled default calendar and persists navigation', async () => {
    const user = userEvent.setup()
    await renderScenario()
    expect(
      screen.getByRole('button', { name: /Downtown San Mateo events/ })
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Grid' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await screen.findByRole('button', { name: /Next month preview/ })
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(
      /September 2026/
    )
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /September 2026/
    )
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Go to today' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /September 2026/
    )
    expect(localStorage.getItem('calendar-explorer:v1')).toContain('2026-09')
    const calendarTable = screen.getByRole('table', { name: 'September 2026' })
    expect(within(calendarTable).getAllByRole('row')).toHaveLength(7)
    expect(within(calendarTable).getAllByRole('columnheader')).toHaveLength(7)
    expect(within(calendarTable).getAllByRole('cell')).toHaveLength(42)
  })

  it('switches calendars without resetting representation', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(screen.getByRole('tab', { name: 'List' }))
    await user.click(
      screen.getByRole('button', { name: /Downtown San Mateo events/ })
    )
    await user.click(
      await screen.findByRole('menuitemradio', { name: /Codex reset watch/ })
    )
    expect(await screen.findByText('Regular resets')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(
      await screen.findByRole('button', { name: /Codex Reset,/ })
    ).toBeVisible()
  })

  it('allows an intentional empty filter and disables subscription', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(
      screen.getByRole('button', { name: 'Places: B Street + Central Park' })
    )
    const allPlaces = await screen.findByRole('menuitemcheckbox', {
      name: 'All places'
    })
    await user.click(allPlaces)
    await user.click(allPlaces)
    expect(
      (await screen.findAllByText(/No events match an empty filter selection/))
        .length
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toHaveAccessibleDescription(/Choose at least one filter option/)
  })

  it('shows a month empty state without disabling a valid subscription', async () => {
    window.history.replaceState({}, '', '/?__scenario=empty')
    renderApp()
    expect(
      await screen.findByText(/No events in .* for these filters/)
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toBeEnabled()
  })

  it('opens anchored event detail and restores focus on Escape', async () => {
    const user = userEvent.setup()
    await renderScenario()
    const trigger = screen.getByRole('button', { name: /Yoga in the Park/ })
    await user.click(trigger)
    const detailText = await screen.findByText(/Fixture event used/)
    expect(detailText.closest('[role="dialog"]')).toHaveAttribute(
      'aria-label',
      'Yoga in the Park details'
    )
    const sourceLink = screen.getByText('View event source').closest('a')
    expect(sourceLink).toHaveAttribute(
      'href',
      'https://example.com/events/yoga'
    )
    expect(sourceLink).not.toHaveAttribute('type')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('reveals busy-day overflow before resolving the hidden event', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(screen.getByRole('button', { name: '+1 more' }))
    const dayTitle = await screen.findByText('Saturday, September 12, 2026')
    const dialog = dayTitle.closest<HTMLElement>('[role="dialog"]')!
    const hiddenEvent = dialog.querySelector<HTMLButtonElement>(
      '[id^="calendar-overflow-event-"]'
    )!
    expect(hiddenEvent).toHaveAttribute(
      'aria-label',
      'Walk, Run, Ride to the Moon, All day, Central Park'
    )
    await user.click(hiddenEvent)
    expect(within(dialog).getByText('Event details')).toBeInTheDocument()
    const back = screen
      .getAllByText(/Back to/)
      .map(text => text.closest('button'))
      .find(button => button && !button.closest('[hidden]'))
    expect(back).toBeInTheDocument()
    await waitFor(() => expect(back).toHaveFocus())
    await user.click(back!)
    expect(within(dialog).getByText(/Saturday/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
  })

  it('uses inline detail and whole-day targets on narrow screens', async () => {
    setMedia('(max-width: 700px)', true)
    const user = userEvent.setup()
    await renderScenario()
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    const trigger = screen.getByRole('button', { name: /Yoga in the Park/ })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls')
    const visibleClose = screen
      .getAllByRole('button', { name: 'Close event details', hidden: true })
      .find(
        button =>
          button.getClientRects().length > 0 || !button.closest('[hidden]')
      )!
    expect(visibleClose).toBeVisible()
    await user.click(trigger)
    await waitFor(() =>
      expect(visibleClose.closest('[data-state]')).toHaveAttribute(
        'data-state',
        'closed'
      )
    )
    await user.click(trigger)
    await user.click(visibleClose)
    await waitFor(() =>
      expect(visibleClose.closest('[data-state]')).toHaveAttribute(
        'data-state',
        'closed'
      )
    )
    await waitFor(() => expect(trigger).toHaveFocus())
    await user.click(screen.getByRole('tab', { name: 'Grid' }))
    await user.click(
      screen.getAllByRole('button', { name: /1 event.*Show in List/ })[0]!
    )
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('copies the exact URL and reports clipboard failure', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
    await renderScenario()
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    expect(screen.getByText('Apple Calendar').closest('a')).toHaveAttribute(
      'href',
      'webcal://localhost:8787/dtsm-events.ics'
    )
    await user.click(
      await screen.findByRole('menuitem', { name: /Google Calendar/ })
    )
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:8787/dtsm-events.ics'
    )
    expect(await screen.findByText(/Link copied/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    await user.click(await screen.findByRole('menuitem', { name: /Outlook/ }))
    expect(await screen.findByText(/Subscribe from web/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    await user.click(
      await screen.findByRole('menuitem', { name: /Copy subscription/ })
    )
    expect(
      await screen.findByText('Subscription link copied.')
    ).toBeInTheDocument()
    writeText.mockRejectedValueOnce(new Error('denied'))
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    await user.click(
      await screen.findByRole('menuitem', { name: /Copy subscription/ })
    )
    expect(await screen.findByText(/Couldn’t copy/)).toBeInTheDocument()
    await waitFor(
      () => expect(screen.queryByText(/Couldn’t copy/)).not.toBeInTheDocument(),
      { timeout: 5000 }
    )
  }, 15_000)

  it('uses the exact filtered URL for subscription actions', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(
      screen.getByRole('button', { name: /Downtown San Mateo events/ })
    )
    await user.click(
      await screen.findByRole('menuitemradio', { name: /Codex reset watch/ })
    )
    const banked = await screen.findByRole('checkbox', {
      name: 'Banked resets'
    })
    await user.click(banked)
    await screen.findByRole('button', { name: /Codex Reset,/ })
    await user.click(screen.getByRole('button', { name: 'Add to calendar' }))
    expect(screen.getByText('Apple Calendar').closest('a')).toHaveAttribute(
      'href',
      'webcal://localhost:8787/codex-resets.ics?types=regular,scheduled,forecast'
    )
  })

  it('renders retryable feed and options failures', async () => {
    const user = userEvent.setup()
    let feedAttempts = 0
    let optionAttempts = 0
    const request = vi.fn<typeof fetch>(async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/options.json')) {
        optionAttempts += 1
        return new Response(JSON.stringify(visualOptions), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      feedAttempts += 1
      if (feedAttempts <= 2)
        return new Response('temporary feed failure', { status: 503 })
      return new Response(visualCalendar('busy', 'dtsm', url.toString()))
    })
    vi.stubGlobal('fetch', request)
    const first = renderApp()
    expect(
      await screen.findByText(
        /Couldn’t load this calendar/,
        {},
        { timeout: 3000 }
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toHaveAccessibleDescription(/Retry this calendar/)
    await user.click(screen.getByRole('button', { name: /Retry/ }))
    expect(
      await screen.findByRole('button', { name: /Yoga in the Park/ })
    ).toBeVisible()
    expect(feedAttempts).toBe(3)
    first.unmount()

    feedAttempts = 0
    optionAttempts = 0
    request.mockImplementation(async input => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/options.json')) {
        optionAttempts += 1
        if (optionAttempts <= 2)
          return new Response('temporary options failure', { status: 503 })
        return new Response(JSON.stringify(visualOptions), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(visualCalendar('busy', 'dtsm', url.toString()))
    })
    renderApp()
    expect(
      await screen.findByText(/Filters are unavailable/, {}, { timeout: 3000 })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('button', {
        name: 'Places: B Street + Central Park'
      })
    ).toBeVisible()
    expect(optionAttempts).toBe(3)
  })

  it('does not persist discovery reconciliation and reports storage failure', async () => {
    localStorage.setItem(
      'calendar-explorer:v1',
      JSON.stringify({
        filters: { dtsm: { venueIds: [999999], organizerIds: null } }
      })
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await renderScenario()
    expect(setItem).not.toHaveBeenCalled()

    setItem.mockImplementation(() => {
      throw new Error('quota')
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'List' }))
    expect(
      await screen.findByText(/this browser could not save it/i)
    ).toBeVisible()
  })

  it('filters all Codex event types to an empty state', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(
      screen.getByRole('button', { name: /Downtown San Mateo events/ })
    )
    await user.click(
      await screen.findByRole('menuitemradio', { name: /Codex reset watch/ })
    )
    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
    for (const checkbox of checkboxes) await user.click(checkbox)
    expect(
      (await screen.findAllByText(/No events match an empty filter selection/))
        .length
    ).toBeGreaterThan(0)
    await user.click(checkboxes[0]!)
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toBeDisabled()
  })

  it('updates dynamic multi-select summaries and category fallback', async () => {
    const user = userEvent.setup()
    await renderScenario()
    await user.click(screen.getByRole('button', { name: 'Type: All types' }))
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Community' })
    )
    expect(
      screen.getByRole('button', { name: 'Type: 3 selected' })
    ).toBeVisible()
    const allTypes = await screen.findByRole('menuitemcheckbox', {
      name: 'All types'
    })
    await user.click(allTypes)
    await user.click(allTypes)
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Arts & Culture' })
    )
    expect(
      screen.getByRole('button', { name: 'Type: Arts & Culture' })
    ).toBeVisible()

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Yoga in the Park/ })
      ).not.toBeInTheDocument()
    )
    await user.click(
      await screen.findByRole('button', { name: /Neighborhood cleanup/ })
    )
    const detailTitle = await screen.findByText('Neighborhood cleanup', {
      selector: 'h3'
    })
    const detail = detailTitle.closest<HTMLElement>('[role="dialog"]')!
    expect(
      within(detail).getAllByText('Downtown San Mateo events').length
    ).toBeGreaterThan(0)
  })

  it('shows compact grid overflow', async () => {
    setMedia('(max-width: 1150px)', true)
    await renderScenario()
    expect(screen.getByRole('button', { name: '+2 more' })).toBeVisible()
  })

  it('shows mobile filter summaries', async () => {
    setMedia('(max-width: 700px)', true)
    const user = userEvent.setup()
    await renderScenario()
    const filter = screen.getByRole('button', { name: /Filter events/ })
    expect(filter).toHaveTextContent('Default events')
    await user.click(filter)
    await user.click(screen.getByRole('button', { name: 'Type: All types' }))
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Community' })
    )
    expect(filter).toHaveTextContent('1 active')
    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('button', { name: /Downtown San Mateo events/ })
    )
    await user.click(
      await screen.findByRole('menuitemradio', { name: /Codex reset watch/ })
    )
    expect(
      screen.getByRole('button', { name: /Filter resets/ })
    ).toHaveTextContent('All resets')
  })

  it('renders a failed feed in the persisted List representation', async () => {
    localStorage.setItem(
      'calendar-explorer:v1',
      JSON.stringify({ view: 'list' })
    )
    window.history.replaceState({}, '', '/?__scenario=feed-error')
    renderApp()
    await screen.findByText(
      /Couldn’t load this calendar/,
      {},
      { timeout: 3000 }
    )
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
  })
})
