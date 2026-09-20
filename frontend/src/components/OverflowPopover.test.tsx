import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { currentMonth, parseCalendar, projectionsForMonth } from '../calendar'
import { system } from '../theme'
import { visualCalendar } from '../visual-fixtures'
import { OverflowPopover } from './OverflowPopover'

const month = currentMonth()
const projections = projectionsForMonth(
  parseCalendar(
    visualCalendar(
      'busy',
      'dtsm',
      'http://localhost:8787/dtsm-events.ics?scope=all'
    ),
    'dtsm'
  ),
  month
).filter(projection => projection.dateKey === `${month}-12`)

function view() {
  return (
    <ChakraProvider value={system}>
      <OverflowPopover projections={projections} day={`${month}-12`} />
    </ChakraProvider>
  )
}

describe('OverflowPopover', () => {
  it('restores focus once without stealing it on a parent re-render', async () => {
    const user = userEvent.setup()
    const result = render(view())
    await user.click(
      screen.getByRole('button', { name: `+${projections.length} more` })
    )
    const first = document.querySelector<HTMLButtonElement>(
      '[id*="calendar-overflow-event-long"]'
    )!
    const second = document.querySelector<HTMLButtonElement>(
      '[id*="calendar-overflow-event-music"]'
    )!
    const firstId = first.id
    const secondId = second.id

    fireEvent.click(first)
    await screen.findByText('Event details')
    const back = document.querySelector<HTMLButtonElement>(
      '[id^="calendar-overflow-back-"]'
    )!
    await waitFor(() => expect(back).toHaveFocus())
    fireEvent.click(back)
    const restored = document.getElementById(firstId)!
    await waitFor(() => expect(restored).toHaveFocus())

    const next = document.getElementById(secondId)!
    next.focus()
    expect(next).toHaveFocus()
    result.rerender(view())
    expect(next).toHaveFocus()
  })
})
