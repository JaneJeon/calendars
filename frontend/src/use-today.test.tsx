import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useToday } from './use-today'

afterEach(() => vi.useRealTimers())

it('updates at LA midnight and when a hidden tab becomes visible', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T06:59:59Z'))
  const { result, unmount } = renderHook(() => useToday(new Date()))
  expect(result.current).toBe('2026-09-26')

  act(() => vi.advanceTimersByTime(1025))
  expect(result.current).toBe('2026-09-27')

  vi.setSystemTime(new Date('2026-09-28T07:10:00Z'))
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(result.current).toBe('2026-09-27')
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(result.current).toBe('2026-09-28')

  vi.setSystemTime(new Date('2026-09-29T07:10:00Z'))
  act(() => window.dispatchEvent(new Event('focus')))
  expect(result.current).toBe('2026-09-29')
  unmount()
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false
  })
})
